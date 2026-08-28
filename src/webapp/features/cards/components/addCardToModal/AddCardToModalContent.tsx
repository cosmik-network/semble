'use client';

import type { Collection, UrlCard } from '@semble/types';
import { Button, Stack, Text } from '@mantine/core';
import { useState, useEffect } from 'react';
import { MdOutlineStickyNote2 } from 'react-icons/md';
import CollectionSelector from '@/features/collections/components/collectionSelector/CollectionSelector';
import useGetCardFromMyLibrary from '@/features/cards/lib/queries/useGetCardFromMyLibrary';
import useRemoveCardFromLibrary from '@/features/cards/lib/mutations/useRemoveCardFromLibrary';
import { notifications } from '@mantine/notifications';
import { BsExclamation } from 'react-icons/bs';
import CardToBeAddedPreview from '../cardToBeAddedPreview/CardToBeAddedPreview';
import CardNoteEditor from '../cardNoteEditor/CardNoteEditor';

interface Props {
  onClose: () => void;
  onSubmit: (data: {
    isAddingNewCard: boolean;
    cardData?: {
      url: string;
      note?: string;
      collectionIds: string[];
      viaCardId?: string;
    };
    updateData?: {
      cardId: string;
      note?: string;
      addToCollectionIds?: string[];
      removeFromCollectionIds?: string[];
      addToLibrary?: boolean;
      viaCardId?: string;
    };
  }) => void;
  url: string;
  cardContent?: UrlCard['cardContent'];
  urlLibraryCount: number;
  isInYourLibrary?: boolean;
  viaCardId?: string;
  isSaving: boolean;
}

export default function AddCardToModalContent(props: Props) {
  const cardStatus = useGetCardFromMyLibrary({ url: props.url });

  // The viewer's own note for this URL, whoever's card opened the modal
  const savedNote = cardStatus.data.card?.note?.text;
  const [note, setNote] = useState(savedNote);
  const [isEditingNote, setIsEditingNote] = useState(false);

  const collectionsWithCard = cardStatus.data.collections ?? [];

  const [selectedCollections, setSelectedCollections] =
    useState<Collection[]>(collectionsWithCard);

  // Sync state with query data when it changes
  useEffect(() => {
    setSelectedCollections(cardStatus.data.collections ?? []);
  }, [cardStatus.data.collections]);

  const removeCard = useRemoveCardFromLibrary();

  const handleDeleteCard = () => {
    const cardId = cardStatus.data.card?.id;
    if (!cardId) return;

    removeCard.mutate(cardId, {
      onError: () => {
        notifications.show({
          message: 'Could not delete card',
          color: 'red',
          autoClose: 5000,
          withCloseButton: true,
          position: 'top-center',
          icon: <BsExclamation />,
        });
      },
      onSettled: () => {
        props.onClose();
      },
    });
  };

  const handleUpdateCard = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedNote = note?.trimEnd() === '' ? undefined : note;

    const addedCollections = selectedCollections.filter(
      (c) => !collectionsWithCard.some((original) => original.id === c.id),
    );

    const removedCollections = collectionsWithCard.filter(
      (c) => !selectedCollections.some((selected) => selected.id === c.id),
    );

    // Only ever send a non-empty note: the update endpoint rejects an empty
    // string and takes the collection changes in the same request down with
    // it. Removing a note goes through the editor's delete action instead.
    const hasNoteChanged = !!trimmedNote && trimmedNote !== savedNote;
    const hasAdded = addedCollections.length > 0;
    const hasRemoved = removedCollections.length > 0;

    // no change, close modal
    if (cardStatus.data.card && !hasNoteChanged && !hasAdded && !hasRemoved) {
      props.onClose();
      return;
    }

    // card not yet in library, add it
    if (!cardStatus.data.card) {
      props.onSubmit({
        isAddingNewCard: true,
        cardData: {
          url: props.url,
          note: trimmedNote,
          collectionIds: selectedCollections.map((c) => c.id),
          viaCardId: props.viaCardId,
        },
      });
      return;
    }

    // card already in library, update associations instead
    const updatedCardPayload: {
      cardId: string;
      note?: string;
      addToCollectionIds?: string[];
      removeFromCollectionIds?: string[];
      addToLibrary?: boolean;
      viaCardId?: string;
    } = { cardId: cardStatus.data.card.id };

    if (hasNoteChanged) updatedCardPayload.note = trimmedNote;
    if (hasAdded)
      updatedCardPayload.addToCollectionIds = addedCollections.map((c) => c.id);
    if (hasRemoved)
      updatedCardPayload.removeFromCollectionIds = removedCollections.map(
        (c) => c.id,
      );

    // Track as a card save if we're adding collections or a note (indicates user is saving/organizing the card)
    updatedCardPayload.addToLibrary = hasAdded || hasNoteChanged;
    updatedCardPayload.viaCardId = props.viaCardId;

    props.onSubmit({
      isAddingNewCard: false,
      updateData: updatedCardPayload,
    });
  };

  return (
    <Stack gap={'md'}>
      <CardToBeAddedPreview
        url={props.url}
        title={props.cardContent?.title}
        imageUrl={props.cardContent?.imageUrl}
        libraryCount={props.urlLibraryCount}
        isInYourLibrary={props.isInYourLibrary}
        action={
          !isEditingNote && (
            <Button
              variant="light"
              size="xs"
              color="gray"
              leftSection={<MdOutlineStickyNote2 />}
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingNote(true);
              }}
            >
              {savedNote ? 'Edit note' : 'Add note'}
            </Button>
          )
        }
      >
        {isEditingNote && (
          <CardNoteEditor
            note={note}
            onChange={setNote}
            noteId={cardStatus.data.card?.note?.id}
            onDeleted={props.onClose}
            onCancel={() => {
              setNote(savedNote);
              setIsEditingNote(false);
            }}
          />
        )}
      </CardToBeAddedPreview>

      <CollectionSelector
        isOpen={true}
        url={props.url}
        onClose={props.onClose}
        onCancel={() => {
          props.onClose();
          setSelectedCollections(cardStatus.data.collections ?? []);
        }}
        onSave={handleUpdateCard}
        isSaving={props.isSaving}
        onDeleteCard={cardStatus.data.card ? handleDeleteCard : undefined}
        isDeletingCard={removeCard.isPending}
        selectedCollections={selectedCollections}
        onSelectedCollectionsChange={setSelectedCollections}
      />
    </Stack>
  );
}
