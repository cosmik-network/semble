import { Button, Stack, Modal } from '@mantine/core';
import useRemoveCardFromLibrary from '../../lib/mutations/useRemoveCardFromLibrary';
import { notifications } from '@mantine/notifications';
import { DANGER_OVERLAY_PROPS } from '@/styles/overlays';
import { BsExclamation } from 'react-icons/bs';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
}

export default function RemoveCardFromLibraryModal(props: Props) {
  const removeCardFromLibrary = useRemoveCardFromLibrary();

  const handleRemoveCardFromLibrary = () => {
    removeCardFromLibrary.mutate(props.cardId, {
      onError: () => {
        notifications.show({
          message: 'Could not remove card from library',
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
      title="Remove card from library"
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
          onClick={handleRemoveCardFromLibrary}
          loading={removeCardFromLibrary.isPending}
        >
          Remove
        </Button>
      </Stack>
    </Modal>
  );
}
