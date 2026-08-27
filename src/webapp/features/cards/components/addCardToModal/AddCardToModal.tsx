import type { UrlCard } from '@semble/types';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import { Button, Modal, Skeleton, Stack } from '@mantine/core';
import { Suspense } from 'react';
import { MdOutlineStickyNote2 } from 'react-icons/md';
import CollectionSelectorSkeleton from '@/features/collections/components/collectionSelector/Skeleton.CollectionSelector';
import AddCardToModalContent from './AddCardToModalContent';
import CardToBeAddedPreview from '../cardToBeAddedPreview/CardToBeAddedPreview';
import {
  CardSaveAnalyticsContext,
  CardSaveSource,
} from '@/features/analytics/types';
import useOnboardingMilestones from '@/features/onboarding/lib/useOnboardingMilestones';
import useAddCard from '@/features/cards/lib/mutations/useAddCard';
import useUpdateCardAssociations from '@/features/cards/lib/mutations/useUpdateCardAssociations';
import { notifications } from '@mantine/notifications';
import { track } from '@vercel/analytics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  isInYourLibrary?: boolean;
  urlLibraryCount: number;
  viaCardId?: string;
  cardContent?: UrlCard['cardContent'];
  analyticsContext?: CardSaveAnalyticsContext;
}

export default function AddCardToModal(props: Props) {
  const onboarding = useOnboardingMilestones();
  const addCard = useAddCard(props.analyticsContext);
  const updateCardAssociations = useUpdateCardAssociations(
    props.analyticsContext,
  );

  const isOnboardingSave =
    props.analyticsContext?.saveSource === CardSaveSource.ONBOARDING;

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

      addCard.mutate(
        { ...data.cardData, notificationId },
        {
          // Recorded here rather than in useAddCard so the composer's "add a
          // link of your own" path does not claim a guide it never showed.
          // The card itself is recorded by useAddCard, which also covers that
          // composer path.
          onSuccess: () => {
            if (isOnboardingSave) onboarding.recordSaveGuideCompleted();
          },
        },
      );
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

      const updateData = data.updateData;

      updateCardAssociations.mutate(
        { ...updateData, notificationId },
        {
          // The other half of the save. A URL already in the library takes this
          // branch instead of useAddCard, and adding a note or a collection to
          // it is a save — it is what the existing `card_saved` posthog event
          // fires on here. Gated on the same addToLibrary flag, so merely
          // removing a card from a collection is not counted.
          onSuccess: () => {
            if (!isOnboardingSave || !updateData.addToLibrary) return;

            onboarding.recordCardSaved(props.url);
            onboarding.recordSaveGuideCompleted();
          },
        },
      );
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
      <Stack justify="space-between" gap={'md'}>
        <Suspense
          fallback={
            <>
              <CardToBeAddedPreview
                url={props.url}
                title={props.cardContent?.title}
                imageUrl={props.cardContent?.imageUrl}
                libraryCount={props.urlLibraryCount}
                isInYourLibrary={props.isInYourLibrary}
                action={
                  <Skeleton radius={'xl'}>
                    <Button
                      variant="light"
                      size="xs"
                      color="gray"
                      leftSection={<MdOutlineStickyNote2 />}
                    >
                      Add note
                    </Button>
                  </Skeleton>
                }
              />
              <CollectionSelectorSkeleton />
            </>
          }
        >
          <AddCardToModalContent
            key={`${props.url}-${props.isOpen}`}
            onClose={props.onClose}
            onSubmit={handleSubmit}
            url={props.url}
            cardContent={props.cardContent}
            urlLibraryCount={props.urlLibraryCount}
            isInYourLibrary={props.isInYourLibrary}
            viaCardId={props.viaCardId}
            isSaving={addCard.isPending || updateCardAssociations.isPending}
          />
        </Suspense>
      </Stack>
    </Modal>
  );
}
