'use client';

import { Collection, CollectionAccessType } from '@semble/types';
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
import { useQueryClient } from '@tanstack/react-query';
import { collectionKeys } from '../../lib/collectionKeys';
import { BsExclamation } from 'react-icons/bs';

interface Props {
  onClose: () => void;
  initialName?: string;
  initialAccessType?: CollectionAccessType;
  onCreate?: (collection: Collection) => void;
}

export default function CreateCollectionForm(props: Props) {
  const createCollection = useCreateCollection();
  const queryClient = useQueryClient();
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
        onSuccess: async (data) => {
          if (data?.collectionId && props.onCreate) {
            // Wait for the query to refetch and get the new collection
            await queryClient.refetchQueries({
              queryKey: collectionKeys.mine(),
            });

            // Find the newly created collection from the cache
            const queryState = queryClient.getQueryState<{
              pages: Array<{ collections: Collection[] }>;
            }>(collectionKeys.mine());

            // Look through all pages to find the collection
            const newCollection = queryState?.data?.pages
              .flatMap((page) => page.collections ?? [])
              .find((col) => col.id === data.collectionId);

            if (newCollection) {
              props.onCreate(newCollection);
            }
          }
          props.onClose();
        },
        onError: () => {
          notifications.show({
            message: 'Could not create collection',
            color: 'red',
            title: 'Error',
            position: 'top-center',
            loading: false,
            autoClose: false,
            withCloseButton: true,
            icon: <BsExclamation />,
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
