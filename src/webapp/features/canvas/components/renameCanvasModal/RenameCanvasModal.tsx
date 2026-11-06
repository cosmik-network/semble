import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Stack,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { BsTrash2Fill } from 'react-icons/bs';
import { useForm } from '@mantine/form';
import { UPDATE_OVERLAY_PROPS } from '@/styles/overlays';
import useRenameCanvas from '../../lib/mutations/useRenameCanvas';
import { showCanvasError } from '../../lib/showCanvasError';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  canvasId: string;
  name: string;
  // Offers deleting the canvas too
  onDelete?: () => void;
}

export default function RenameCanvasModal(props: Props) {
  const renameCanvas = useRenameCanvas();

  const form = useForm({
    initialValues: {
      name: props.name,
    },
  });

  const handleRenameCanvas = (e: React.FormEvent) => {
    e.preventDefault();

    renameCanvas.mutate(
      { id: props.canvasId, name: form.values.name.trim() },
      {
        onError: () => showCanvasError('Could not rename canvas'),
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
      title="Rename Canvas"
      centered
      onClick={(e) => e.stopPropagation()}
      overlayProps={UPDATE_OVERLAY_PROPS}
    >
      <form onSubmit={handleRenameCanvas}>
        <Stack gap={'xl'}>
          <TextInput
            id="name"
            label="Name"
            placeholder="Canvas name"
            variant="filled"
            size="md"
            required
            maxLength={100}
            data-autofocus
            key={form.key('name')}
            {...form.getInputProps('name')}
          />

          <Group gap={'xs'} wrap="nowrap">
            {props.onDelete && (
              <Tooltip label="Delete canvas">
                <ActionIcon
                  size={42}
                  radius="xl"
                  variant="light"
                  color="red"
                  aria-label="Delete canvas"
                  disabled={renameCanvas.isPending}
                  onClick={props.onDelete}
                >
                  <BsTrash2Fill size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            <Button
              variant="light"
              size="md"
              color="gray"
              onClick={props.onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="md"
              style={{ flex: 1 }}
              disabled={!form.values.name.trim()}
              loading={renameCanvas.isPending}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
