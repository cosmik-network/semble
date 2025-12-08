import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import { Modal, Stack, Text } from '@mantine/core';
import { Suspense } from 'react';
import CollectionSelectorSkeleton from '@/features/collections/components/collectionSelector/Skeleton.CollectionSelector';
import AddCardToModalContent from './AddCardToModalContent';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  cardId?: string;
  note?: string;
  isInYourLibrary?: boolean;
  urlLibraryCount: number;
  viaCardId?: string;
}

export default function AddCardToModal(props: Props) {
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
      <Suspense fallback={<CollectionSelectorSkeleton />}>
        <AddCardToModalContent
          onClose={props.onClose}
          url={props.url}
          cardId={props.cardId}
          note={props.note}
          viaCardId={props.viaCardId}
        />
      </Suspense>
    </Modal>
  );
}
