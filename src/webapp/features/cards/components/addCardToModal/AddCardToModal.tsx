import type { UrlCard } from '@semble/types';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import { Modal, Stack } from '@mantine/core';
import { Suspense } from 'react';
import CollectionSelectorSkeleton from '@/features/collections/components/collectionSelector/Skeleton.CollectionSelector';
import AddCardToModalContent from './AddCardToModalContent';
import CardToBeAddedPreview from '../cardToBeAddedPreview/CardToBeAddedPreview';
import { CardSaveAnalyticsContext } from '@/features/analytics/types';
import useAddCard from '@/features/cards/lib/mutations/useAddCard';
import useUpdateCardAssociations from '@/features/cards/lib/mutations/useUpdateCardAssociations';
import { notifications } from '@mantine/notifications';
import { track } from '@vercel/analytics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  cardId?: string;
  note?: string;
  isInYourLibrary?: boolean;
  urlLibraryCount: number;
  viaCardId?: string;
  cardContent?: UrlCard['cardContent'];
  analyticsContext?: CardSaveAnalyticsContext;
}

export default function AddCardToModal(props: Props) {
  const addCard = useAddCard(props.analyticsContext);
  const updateCardAssociations = useUpdateCardAssociations(
    props.analyticsContext,
  );

  const handleSubmit = (data: {
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
  }) => {
    track('add or update existing card');

    if (data.isAddingNewCard && data.cardData) {
      const notificationId = `add-card-${Date.now()}`;
      notifications.show({
        id: notificationId,
        loading: true,
        title: 'Adding card...',
        message: 'Please wait',
        position: 'top-center',
        autoClose: false,
        withCloseButton: false,
      });

      props.onClose();

      addCard.mutate({ ...data.cardData, notificationId });
    } else if (!data.isAddingNewCard && data.updateData) {
      const notificationId = `update-card-${Date.now()}`;
      notifications.show({
        id: notificationId,
        loading: true,
        title: 'Updating card...',
        message: 'Please wait',
        position: 'top-center',
        autoClose: false,
        withCloseButton: false,
      });

      props.onClose();

      updateCardAssociations.mutate({ ...data.updateData, notificationId });
    }
  };

  return (
    <Modal
      opened={props.isOpen}
      onClose={props.onClose}
      title="Save card"
      overlayProps={DEFAULT_OVERLAY_PROPS}
      centered
      onClick={(e) => e.stopPropagation()}
    >
      <Stack justify="space-between" gap={'xs'}>
        <CardToBeAddedPreview
          url={props.url}
          title={props.cardContent?.title}
          imageUrl={props.cardContent?.imageUrl}
          libraryCount={props.urlLibraryCount}
          isInYourLibrary={props.isInYourLibrary}
        />
        <Suspense fallback={<CollectionSelectorSkeleton />}>
          <AddCardToModalContent
            key={`${props.url}-${props.isOpen}`}
            onClose={props.onClose}
            onSubmit={handleSubmit}
            url={props.url}
            cardId={props.cardId}
            cardContent={props.cardContent}
            note={props.note}
            viaCardId={props.viaCardId}
            isSaving={addCard.isPending || updateCardAssociations.isPending}
          />
        </Suspense>
      </Stack>
    </Modal>
  );
}
