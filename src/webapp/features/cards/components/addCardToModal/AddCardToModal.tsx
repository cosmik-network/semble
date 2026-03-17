import type { UrlCard } from '@semble/types';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import { Modal, Stack, Text } from '@mantine/core';
import { Suspense } from 'react';
import CollectionSelectorSkeleton from '@/features/collections/components/collectionSelector/Skeleton.CollectionSelector';
import AddCardToModalContent from './AddCardToModalContent';
import CardToBeAddedPreview from '../cardToBeAddedPreview/CardToBeAddedPreview';
import { CardSaveAnalyticsContext } from '@/features/analytics/types';
import useAddCard from '@/features/cards/lib/mutations/useAddCard';
import useUpdateCardAssociations from '@/features/cards/lib/mutations/useUpdateCardAssociations';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import { notifications } from '@mantine/notifications';
import { track } from '@vercel/analytics';
import { BsCheck, BsExclamation } from 'react-icons/bs';

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
  const { data: featureFlags } = useFeatureFlags();
  const addCard = useAddCard(props.analyticsContext);
  const updateCardAssociations = useUpdateCardAssociations(
    props.analyticsContext,
  );

  const count = props.urlLibraryCount ?? 0;

  const subtitle = (() => {
    if (count === 0) return 'Not saved by anyone yet';

    if (props.isInYourLibrary) {
      if (count === 1) return 'Saved by you';
      return `Saved by you and ${count - 1} other${count - 1 > 1 ? 's' : ''}`;
    } else {
      if (count === 1) return 'Saved by 1 person';
      return `Saved by ${count} people`;
    }
  })();

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

    const isOptimistic = featureFlags?.optimisticCardAdding ?? false;

    if (data.isAddingNewCard && data.cardData) {
      if (isOptimistic) {
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

        addCard.mutate(data.cardData, {
          onSuccess: () => {
            notifications.update({
              id: notificationId,
              color: 'green',
              title: 'Success!',
              message: 'Card added',
              position: 'top-center',
              loading: false,
              autoClose: 3000,
              icon: <BsCheck />,
            });
          },
          onError: () => {
            notifications.update({
              id: notificationId,
              color: 'red',
              title: 'Error',
              message: 'Could not add card',
              loading: false,
              autoClose: 5000,
              withCloseButton: true,
              position: 'top-center',
              icon: <BsExclamation />,
            });
          },
        });
      } else {
        addCard.mutate(data.cardData, {
          onError: () => {
            notifications.show({
              color: 'red',
              title: 'Error',
              message: 'Could not add card',
              loading: false,
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
      }
    } else if (!data.isAddingNewCard && data.updateData) {
      if (isOptimistic) {
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

        updateCardAssociations.mutate(data.updateData, {
          onSuccess: () => {
            notifications.update({
              id: notificationId,
              color: 'green',
              title: 'Success!',
              message: 'Card updated',
              position: 'top-center',
              loading: false,
              autoClose: 3000,
              icon: <BsCheck />,
            });
          },
          onError: () => {
            notifications.update({
              id: notificationId,
              color: 'red',
              title: 'Error',
              message: 'Could not update card',
              position: 'top-center',
              loading: false,
              autoClose: false,
              withCloseButton: true,
              icon: <BsExclamation />,
            });
          },
        });
      } else {
        updateCardAssociations.mutate(data.updateData, {
          onError: () => {
            notifications.show({
              color: 'red',
              title: 'Error',
              message: 'Could not update card',
              position: 'top-center',
              loading: false,
              autoClose: false,
              withCloseButton: true,
              icon: <BsExclamation />,
            });
          },
          onSettled: () => {
            props.onClose();
          },
        });
      }
    }
  };

  return (
    <Modal
      opened={props.isOpen}
      onClose={props.onClose}
      title={
        <Stack gap={0}>
          <Text fw={600}>Add or update {props.cardId ? 'card' : 'link'}</Text>
          <Text c="gray" fw={500}>
            {subtitle}
          </Text>
        </Stack>
      }
      overlayProps={DEFAULT_OVERLAY_PROPS}
      centered
      onClick={(e) => e.stopPropagation()}
    >
      <Stack justify="space-between" gap={'xs'}>
        <CardToBeAddedPreview
          url={props.url}
          title={props.cardContent?.title}
          imageUrl={props.cardContent?.imageUrl}
        />
        <Suspense fallback={<CollectionSelectorSkeleton />}>
          <AddCardToModalContent
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
