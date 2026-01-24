import {
  Button,
  Container,
  Group,
  Modal,
  Stack,
  Textarea,
  TextInput,
  SegmentedControl,
  Text,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import useUpdateCollection from '../../lib/mutations/useUpdateCollection';
import { UPDATE_OVERLAY_PROPS } from '@/styles/overlays';
import { CollectionAccessType } from '@semble/types';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import { FiLock, FiUnlock } from 'react-icons/fi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  collection: {
    id: string;
    rkey: string;
    name: string;
    description?: string;
    accessType?: CollectionAccessType;
  };
}

export default function EditCollectionModal(props: Props) {
  const updateCollection = useUpdateCollection();
  const { data: featureFlags } = useFeatureFlags();

  const form = useForm({
    initialValues: {
      name: props.collection.name,
      description: props.collection.description,
      accessType: props.collection.accessType || CollectionAccessType.CLOSED,
    },
  });

  const handleUpdateCollection = (e: React.FormEvent) => {
    e.preventDefault();

    updateCollection.mutate(
      {
        collectionId: props.collection.id,
        rkey: props.collection.rkey,
        name: form.values.name,
        description: form.values.description,
        accessType: featureFlags?.openCollections
          ? form.values.accessType
          : undefined,
      },
      {
        onError: () => {
          notifications.show({
            message: 'Could not update collection.',
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
      title="Edit Collection"
      centered
      overlayProps={UPDATE_OVERLAY_PROPS}
    >
      <Container size="sm" p={0}>
        <form onSubmit={handleUpdateCollection}>
          <Stack>
            <TextInput
              id="name"
              label="Name"
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
              rows={5}
              maxLength={500}
              key={form.key('description')}
              {...form.getInputProps('description')}
            />

            {featureFlags?.openCollections && props.collection.accessType && (
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
                color="gray"
                onClick={props.onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="md"
                loading={updateCollection.isPending}
              >
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      </Container>
    </Modal>
  );
}
