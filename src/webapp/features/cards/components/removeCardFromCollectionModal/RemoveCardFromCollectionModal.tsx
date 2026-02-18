import { Button, Stack, Modal } from '@mantine/core';
import useRemoveCardFromCollections from '../../lib/mutations/useRemoveCardFromCollections';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { DANGER_OVERLAY_PROPS } from '@/styles/overlays';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  collectionId: string;
}

export default function RemoveCardFromCollectionModal(props: Props) {
  const removeCardFromCollection = useRemoveCardFromCollections();

  const handleRemoveCardFromCollection = () => {
    removeCardFromCollection.mutate(
      { cardId: props.cardId, collectionIds: [props.collectionId] },
      {
        onError: () => {
          notifications.show({
            message: 'Could not remove card from this collection.',
            position: 'top-center',
          });
        },
        onSettled: () => {
          props.onClose();
        },
      },
    );
  };

  return (
    <Modal
      opened={props.isOpen}
      onClose={props.onClose}
      withCloseButton={false}
      title="Remove card from this collection"
      size={'xs'}
      overlayProps={DANGER_OVERLAY_PROPS}
      centered
      onClick={(e) => e.stopPropagation()}
    >
      <Stack>
        <Button variant="subtle" size="md" color="gray" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          color="red"
          size="md"
          onClick={handleRemoveCardFromCollection}
          loading={removeCardFromCollection.isPending}
        >
          Remove
        </Button>
      </Stack>
    </Modal>
  );
}
