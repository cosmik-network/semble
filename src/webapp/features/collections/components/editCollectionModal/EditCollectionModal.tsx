import { CollectionAccessType } from '@semble/types';
import {
  Button,
  Container,
  Group,
  Modal,
  Select,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import useUpdateCollection from '../../lib/mutations/useUpdateCollection';
import { UPDATE_OVERLAY_PROPS } from '@/styles/overlays';

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
        accessType: form.values.accessType,
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
          <Stack gap={'xl'}>
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
                rows={4}
                maxLength={500}
                key={form.key('description')}
                {...form.getInputProps('description')}
              />

              <Select
                variant="filled"
                size="md"
                label="Access Level"
                defaultValue={CollectionAccessType.CLOSED}
                data={[
                  {
                    value: CollectionAccessType.CLOSED,
                    label: 'Closed — Only you can add',
                  },
                  {
                    value: CollectionAccessType.OPEN,
                    label: 'Open — Anyone can add',
                  },
                ]}
                {...form.getInputProps('accessType')}
              />
            </Stack>

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
