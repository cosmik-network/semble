import { Button, Stack, Modal } from '@mantine/core';
import useDeleteCollection from '../../lib/mutations/useDeleteCollection';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { DANGER_OVERLAY_PROPS } from '@/styles/overlays';
import { BsExclamation } from 'react-icons/bs';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  collectionId: string;
}

export default function DeleteCollectionModal(props: Props) {
  const deleteCollection = useDeleteCollection();
  const router = useRouter();

  const handleDeleteCollection = () => {
    deleteCollection.mutate(props.collectionId, {
      onSuccess: (fes) => {
        props.onClose();
        router.push('./');
      },
      onError: () => {
        notifications.show({
          message: 'Could not delete collection',
          position: 'top-center',
          color: 'red',
          title: 'Error',
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
  };

  return (
    <Modal
      opened={props.isOpen}
      onClose={props.onClose}
      withCloseButton={false}
      title="Delete Collection"
      size={'xs'}
      overlayProps={DANGER_OVERLAY_PROPS}
      centered
    >
      <Stack>
        <Button variant="subtle" size="md" color="gray" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          color="red"
          size="md"
          onClick={handleDeleteCollection}
          loading={deleteCollection.isPending}
          data-autofocus
        >
          Delete
        </Button>
      </Stack>
    </Modal>
  );
}
