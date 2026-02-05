import { CollectionAccessType } from '@semble/types';
import {
  Button,
  Container,
  Group,
  Modal,
  Select,
  Stack,
  Textarea,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import useUpdateCollection from '../../lib/mutations/useUpdateCollection';
import { UPDATE_OVERLAY_PROPS } from '@/styles/overlays';
import { FaSeedling } from 'react-icons/fa6';
import { isMarginUri, getMarginUrl } from '@/lib/utils/margin';
import MarginLogo from '@/components/MarginLogo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  collection: {
    id: string;
    rkey: string;
    name: string;
    description?: string;
    accessType?: CollectionAccessType;
    uri?: string;
    authorHandle?: string;
  };
}

export default function EditCollectionModal(props: Props) {
  const updateCollection = useUpdateCollection();
  const isMargin = isMarginUri(props.collection.uri);
  const marginUrl = getMarginUrl(props.collection.uri, props.collection.authorHandle);

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
      title={
        <Group gap={8} align="center">
          <Text>Edit Collection</Text>
          {isMargin && (
            <MarginLogo
              size={16}
              marginUrl={marginUrl}
              tooltipText="Manage collection on Margin"
            />
          )}
        </Group>
      }
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

              <Stack gap={'xs'}>
                <Select
                  variant="filled"
                  size="md"
                  color="green"
                  label="Collaboration"
                  disabled={isMargin}
                  leftSection={
                    form.getValues().accessType ===
                    CollectionAccessType.OPEN ? (
                      <ThemeIcon
                        size={'md'}
                        variant="light"
                        color={'green'}
                        radius={'xl'}
                      >
                        <FaSeedling size={14} />
                      </ThemeIcon>
                    ) : null
                  }
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
                {isMargin && (
                  <Text size="sm" c="dimmed">
                    Collections made in Margin can't be changed to open.
                  </Text>
                )}
              </Stack>
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
