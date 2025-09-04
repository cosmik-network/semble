import {
  Button,
  Container,
  Drawer,
  Group,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import useCreateCollection from '../../lib/mutations/useCreateCollection';
import { notifications } from '@mantine/notifications';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  onCreate?: (newCollection: {
    id: string;
    name: string;
    cardCount: number;
  }) => void;
}

export default function createCollectionDrawer(props: Props) {
  const createCollection = useCreateCollection();
  const form = useForm({
    initialValues: {
      name: props.initialName ?? '',
      description: '',
    },
  });

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();

    createCollection.mutate(
      {
        name: form.getValues().name,
        description: form.getValues().description,
      },
      {
        onSuccess: (newCollection) => {
          notifications.show({
            message: `Created collection "${form.getValues().name}".`,
          });

          props.onClose();
          props.onCreate &&
            props.onCreate({
              id: newCollection.collectionId,
              name: form.getValues().name,
              cardCount: 0,
            });
        },
        onError: () => {
          notifications.show({
            message: 'Could not create collection.',
          });
        },
        onSettled: () => {
          form.reset();
        },
      },
    );
  };

  return (
    <Drawer
      opened={props.isOpen}
      onClose={props.onClose}
      withCloseButton={false}
      position="bottom"
      size={'30rem'}
      overlayProps={DEFAULT_OVERLAY_PROPS}
    >
      <Drawer.Header>
        <Drawer.Title fz={'xl'} fw={600} mx={'auto'}>
          Create Collection
        </Drawer.Title>
      </Drawer.Header>

      <Container size={'sm'}>
        <form>
          <Stack>
            <TextInput
              id="name"
              label="Name"
              type="text"
              placeholder="Collection name"
              variant="filled"
              size="md"
              required
              maxLength={100}
              key={form.key('name')}
              {...form.getInputProps('name')}
            />

            <Textarea
              id="description"
              label="Description"
              placeholder="Describe what this collection is about"
              variant="filled"
              size="md"
              rows={8}
              maxLength={500}
              key={form.key('description')}
              {...form.getInputProps('description')}
            />
            <Group justify="space-between" gap={'xs'} grow>
              <Button
                variant="light"
                size="md"
                color={'gray'}
                onClick={props.onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCollection}
                size="md"
                loading={createCollection.isPending}
              >
                Create
              </Button>
            </Group>
          </Stack>
        </form>
      </Container>
    </Drawer>
  );
}
