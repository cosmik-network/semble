import { Button, Stack, Modal } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { DANGER_OVERLAY_PROPS } from '@/styles/overlays';
import useDeleteConnection from '../../lib/mutations/useDeleteConnection';
import { BsCheck, BsExclamation } from 'react-icons/bs';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  connectionId: string;
}

export default function DeleteConnectionModal(props: Props) {
  const deleteConnection = useDeleteConnection();

  const handleDelete = () => {
    deleteConnection.mutate(
      { connectionId: props.connectionId },
      {
        onSuccess: () => {
          notifications.show({
            color: 'green',
            title: 'Success!',
            message: 'Connection deleted',
            position: 'top-center',
            loading: false,
            autoClose: 2000,
            icon: <BsCheck />,
          });
        },
        onError: () => {
          notifications.show({
            message: 'Could not delete connection.',
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
      },
    );
  };

  return (
    <Modal
      opened={props.isOpen}
      onClose={props.onClose}
      title="Delete Connection"
      size={'xs'}
      overlayProps={DANGER_OVERLAY_PROPS}
      withCloseButton={false}
      centered
    >
      <Stack>
        <Button variant="subtle" size="md" color="gray" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          size="md"
          color="red"
          onClick={handleDelete}
          loading={deleteConnection.isPending}
        >
          Remove
        </Button>
      </Stack>
    </Modal>
  );
}
