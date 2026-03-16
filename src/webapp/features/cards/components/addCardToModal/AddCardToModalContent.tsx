'use client';

import type { Collection, UrlCard } from '@semble/types';
import { Stack } from '@mantine/core';
import { useState } from 'react';
import CollectionSelectorError from '@/features/collections/components/collectionSelector/Error.CollectionSelector';
import CollectionSelector from '@/features/collections/components/collectionSelector/CollectionSelector';
import useGetCardFromMyLibrary from '@/features/cards/lib/queries/useGetCardFromMyLibrary';
import useMyCollections from '@/features/collections/lib/queries/useMyCollections';
import AddCardActions from '../addCardActions/AddCardActions';

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
  cardId?: string;
  note?: string;
  cardContent?: UrlCard['cardContent'];
  viaCardId?: string;
  isSaving: boolean;
}

export default function AddCardToModalContent(props: Props) {
  const cardStatus = useGetCardFromMyLibrary({ url: props.url });
  const isMyCard = props?.cardId === cardStatus.data.card?.id;
  const [note, setNote] = useState(isMyCard ? props.note : '');
  const { data, error } = useMyCollections();

  if (error) {
    return <CollectionSelectorError />;
  }

  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  const collectionsWithCard = allCollections.filter((c) =>
    cardStatus.data.collections?.some((col) => col.id === c.id),
  );

  const [selectedCollections, setSelectedCollections] =
    useState<Collection[]>(collectionsWithCard);

  const handleUpdateCard = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedNote = note?.trimEnd() === '' ? undefined : note;

    const addedCollections = selectedCollections.filter(
      (c) => !collectionsWithCard.some((original) => original.id === c.id),
    );

    const removedCollections = collectionsWithCard.filter(
      (c) => !selectedCollections.some((selected) => selected.id === c.id),
    );

    const hasNoteChanged = trimmedNote !== props.note;
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
    <Stack>
      <AddCardActions
        note={isMyCard ? note : cardStatus.data.card?.note?.text}
        noteId={cardStatus.data.card?.note?.id}
        onUpdateNote={setNote}
        onClose={props.onClose}
      />

      <CollectionSelector
        isOpen={true}
        onClose={props.onClose}
        onCancel={() => {
          props.onClose();
          setSelectedCollections(collectionsWithCard);
        }}
        onSave={handleUpdateCard}
        isSaving={props.isSaving}
        selectedCollections={selectedCollections}
        onSelectedCollectionsChange={setSelectedCollections}
      />
    </Stack>
  );
}
