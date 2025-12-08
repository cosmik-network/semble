'use client';

import { Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import CollectionSelectorError from '@/features/collections/components/collectionSelector/Error.CollectionSelector';
import CardToBeAddedPreview from '@/features/cards/components/cardToBeAddedPreview/CardToBeAddedPreview';
import CollectionSelector from '@/features/collections/components/collectionSelector/CollectionSelector';
import useGetCardFromMyLibrary from '@/features/cards/lib/queries/useGetCardFromMyLibrary';
import useMyCollections from '@/features/collections/lib/queries/useMyCollections';
import useUpdateCardAssociations from '@/features/cards/lib/mutations/useUpdateCardAssociations';
import useAddCard from '@/features/cards/lib/mutations/useAddCard';
import useUrlMetadata from '../../lib/queries/useUrlMetadata';
import { track } from '@vercel/analytics';

interface SelectableCollectionItem {
  id: string;
  name: string;
  cardCount: number;
}

interface Props {
  onClose: () => void;
  url: string;
  cardId?: string;
  note?: string;
  viaCardId?: string;
}

export default function AddCardToModalContent(props: Props) {
  const {
    data: { metadata },
  } = useUrlMetadata({ url: props.url });
  const cardStatus = useGetCardFromMyLibrary({ url: props.url });
  const isMyCard = props?.cardId === cardStatus.data.card?.id;
  const [note, setNote] = useState(isMyCard ? props.note : '');
  const { data, error } = useMyCollections();

  const addCard = useAddCard();
  const updateCardAssociations = useUpdateCardAssociations();

  if (error) {
    return <CollectionSelectorError />;
  }

  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  const collectionsWithCard = allCollections.filter((c) =>
    cardStatus.data.collections?.some((col) => col.id === c.id),
  );

  const [selectedCollections, setSelectedCollections] =
    useState<SelectableCollectionItem[]>(collectionsWithCard);

  const isSaving = addCard.isPending || updateCardAssociations.isPending;

  const handleUpdateCard = (e: React.FormEvent) => {
    e.preventDefault();
    track('add or update existing card');

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
      addCard.mutate(
        {
          url: props.url,
          note: trimmedNote,
          collectionIds: selectedCollections.map((c) => c.id),
          viaCardId: props.viaCardId,
        },
        {
          onError: () => {
            notifications.show({ message: 'Could not add card.' });
          },
          onSettled: () => {
            props.onClose();
          },
        },
      );
      return;
    }

    // card already in library, update associations instead
    const updatedCardPayload: {
      cardId: string;
      note?: string;
      addToCollectionIds?: string[];
      removeFromCollectionIds?: string[];
    } = { cardId: cardStatus.data.card.id };

    if (hasNoteChanged) updatedCardPayload.note = trimmedNote;
    if (hasAdded)
      updatedCardPayload.addToCollectionIds = addedCollections.map((c) => c.id);
    if (hasRemoved)
      updatedCardPayload.removeFromCollectionIds = removedCollections.map(
        (c) => c.id,
      );

    updateCardAssociations.mutate({
      ...updatedCardPayload,
      viaCardId: props.viaCardId,
    }, {
      onError: () => {
        notifications.show({ message: 'Could not update card.' });
      },
      onSettled: () => {
        props.onClose();
      },
    });
  };

  return (
    <Stack justify="space-between">
      <CardToBeAddedPreview
        url={props.url}
        thumbnailUrl={metadata.imageUrl}
        title={metadata.title}
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
        isSaving={isSaving}
        selectedCollections={selectedCollections}
        onSelectedCollectionsChange={setSelectedCollections}
      />
    </Stack>
  );
}
