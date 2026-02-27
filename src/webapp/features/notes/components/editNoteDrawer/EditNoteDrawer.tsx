import {
  Button,
  Container,
  Drawer,
  Group,
  Stack,
  Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import useUpdateNote from '../../lib/mutations/useUpdateNote';
import { UPDATE_OVERLAY_PROPS } from '@/styles/overlays';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  noteCardId: string;
  note: string;
}

export default function EditNoteDrawer(props: Props) {
  const updateNote = useUpdateNote();

  const form = useForm({
    initialValues: {
      note: props.note,
    },
  });

  const handleUpdateNote = (e: React.FormEvent) => {
    e.preventDefault();

    updateNote.mutate(
      {
        cardId: props.noteCardId,
        note: form.values.note,
      },
      {
        onError: () => {
          notifications.show({
            message: 'Could not update note.',
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
    <Drawer
      opened={props.isOpen}
      onClose={() => {
        props.onClose();
        form.reset();
      }}
      withCloseButton={false}
      position="bottom"
      padding={'sm'}
      size={'xs'}
      overlayProps={UPDATE_OVERLAY_PROPS}
      onClick={(e) => e.stopPropagation()}
    >
      <Drawer.Header>
        <Drawer.Title fz="xl" fw={600} mx="auto">
          Edit Note
        </Drawer.Title>
      </Drawer.Header>

      <Container size="sm" p={0}>
        <form onSubmit={handleUpdateNote}>
          <Stack>
            <Textarea
              id="note"
              label="Note"
              placeholder="Add a note about this card"
              variant="filled"
              size="md"
              rows={5}
              maxLength={500}
              required
              key={form.key('note')}
              {...form.getInputProps('note')}
            />

            <Group justify="space-between" gap={'xs'} grow>
              <Button
                variant="light"
                size="md"
                color="gray"
                onClick={props.onClose}
              >
                Cancel
              </Button>
              <Button
                disabled={form.values.note.trimEnd() === ''}
                type="submit"
                size="md"
                loading={updateNote.isPending}
              >
                Update
              </Button>
            </Group>
          </Stack>
        </form>
      </Container>
    </Drawer>
  );
}
