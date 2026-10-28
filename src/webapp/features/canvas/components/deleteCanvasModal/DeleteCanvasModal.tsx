import { Button, Group, Modal, Text } from '@mantine/core';
import { DANGER_OVERLAY_PROPS } from '@/styles/overlays';
import useDeleteCanvas from '../../lib/mutations/useDeleteCanvas';
import { showCanvasError } from '../../lib/showCanvasError';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  canvasId: string;
  name: string;
}

export default function DeleteCanvasModal(props: Props) {
  const deleteCanvas = useDeleteCanvas();

  const handleDelete = () => {
    deleteCanvas.mutate(props.canvasId, {
      onError: () => showCanvasError('Could not delete canvas'),
      onSettled: props.onClose,
    });
  };

  return (
    <Modal
      opened={props.isOpen}
      onClose={props.onClose}
      withCloseButton={false}
      title="Delete Canvas"
      size={'xs'}
      overlayProps={DANGER_OVERLAY_PROPS}
      centered
      onClick={(e) => e.stopPropagation()}
    >
      <Text fz="sm" mb="md">
        &ldquo;{props.name}&rdquo; will be gone for good. Nothing it points to
        is deleted.
      </Text>
      <Group gap="xs" wrap="nowrap">
        <Button variant="light" size="md" color="gray" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          color="red"
          size="md"
          style={{ flex: 1 }}
          onClick={handleDelete}
          loading={deleteCanvas.isPending}
          data-autofocus
        >
          Delete
        </Button>
      </Group>
    </Modal>
  );
}
