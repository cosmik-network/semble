'use client';

import { CollectionAccessType } from '@semble/types';
import {
  Button,
  Group,
  Select,
  Stack,
  Textarea,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import useCreateCollection from '../../lib/mutations/useCreateCollection';
import { notifications } from '@mantine/notifications';
import { FaSeedling } from 'react-icons/fa6';

interface Props {
  onClose: () => void;
  initialName?: string;
  initialAccessType?: CollectionAccessType;
  onCreate?: () => void;
}

export default function CreateCollectionForm(props: Props) {
  const createCollection = useCreateCollection();
  const form = useForm({
    initialValues: {
      name: props.initialName ?? '',
      description: '',
      accessType: props.initialAccessType ?? CollectionAccessType.CLOSED,
    },
  });

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    createCollection.mutate(
      {
        name: form.getValues().name,
        description: form.getValues().description,
        accessType: form.getValues().accessType,
      },
      {
        onSuccess: () => {
          props.onClose();
          if (props.onCreate) {
            props.onCreate();
          }
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
    <form onSubmit={handleCreateCollection}>
      <Stack gap={'xl'}>
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
          rows={3}
          maxLength={500}
          key={form.key('description')}
          {...form.getInputProps('description')}
        />

        <Select
          variant="filled"
          size="md"
          label="Collaboration"
          leftSection={
            form.getValues().accessType === CollectionAccessType.OPEN ? (
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
          allowDeselect={false}
          defaultValue={CollectionAccessType.CLOSED}
          data={[
            {
              value: CollectionAccessType.CLOSED,
              label: 'Personal — Only you can add',
            },
            {
              value: CollectionAccessType.OPEN,
              label: 'Open — Anyone can add',
            },
          ]}
          {...form.getInputProps('accessType')}
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
          <Button type="submit" size="md" loading={createCollection.isPending}>
            Create
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
