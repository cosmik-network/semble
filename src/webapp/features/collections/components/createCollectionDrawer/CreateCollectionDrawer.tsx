import {
  Button,
  Container,
  Drawer,
  Group,
  Stack,
  Textarea,
  TextInput,
  SegmentedControl,
  Text,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import useCreateCollection from '../../lib/mutations/useCreateCollection';
import { notifications } from '@mantine/notifications';
import { DEFAULT_OVERLAY_PROPS } from '@/styles/overlays';
import { CollectionAccessType } from '@semble/types';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import { FiLock, FiUnlock } from 'react-icons/fi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialName?: string;
  onCreate?: (newCollection: {
    id: string;
    name: string;
    cardCount: number;
  }) => void;
  onSuccess?: (collectionId: string, collectionName: string) => void;
}

export default function createCollectionDrawer(props: Props) {
  const createCollection = useCreateCollection();
  const { data: featureFlags } = useFeatureFlags();
  const form = useForm({
    initialValues: {
      name: props.initialName ?? '',
      description: '',
      accessType: CollectionAccessType.CLOSED,
    },
  });

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    createCollection.mutate(
      {
        name: form.getValues().name,
        description: form.getValues().description,
        accessType: featureFlags?.openCollections
          ? form.getValues().accessType
          : undefined,
      },
      {
        onSuccess: (newCollection) => {
          props.onClose();
          props.onCreate &&
            props.onCreate({
              id: newCollection.collectionId,
              name: form.getValues().name,
              cardCount: 0,
            });
          props.onSuccess &&
            props.onSuccess(newCollection.collectionId, form.getValues().name);
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
      overlayProps={DEFAULT_OVERLAY_PROPS}
    >
      <Drawer.Header>
        <Drawer.Title fz={'xl'} fw={600} mx={'auto'}>
          Create Collection
        </Drawer.Title>
      </Drawer.Header>

      <Container size={'sm'} p={0}>
        <form onSubmit={handleCreateCollection}>
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
              rows={6}
              maxLength={500}
              key={form.key('description')}
              {...form.getInputProps('description')}
            />

            {featureFlags?.openCollections && (
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  Access Type
                </Text>
                <SegmentedControl
                  data={[
                    {
                      label: (
                        <Group gap="xs">
                          <FiUnlock size={14} />
                          <Text size="sm">Open</Text>
                        </Group>
                      ),
                      value: CollectionAccessType.OPEN,
                    },
                    {
                      label: (
                        <Group gap="xs">
                          <FiLock size={14} />
                          <Text size="sm">Closed</Text>
                        </Group>
                      ),
                      value: CollectionAccessType.CLOSED,
                    },
                  ]}
                  key={form.key('accessType')}
                  {...form.getInputProps('accessType')}
                />
                <Text size="xs" c="dimmed">
                  {form.getValues().accessType === CollectionAccessType.OPEN
                    ? 'Anyone can add cards to this collection'
                    : 'Only you can add cards to this collection'}
                </Text>
              </Stack>
            )}

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
                type="submit"
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
