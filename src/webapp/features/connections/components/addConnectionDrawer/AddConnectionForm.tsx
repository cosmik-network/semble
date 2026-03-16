'use client';

import {
  Button,
  Combobox,
  Group,
  Image,
  Input,
  Loader,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  useCombobox,
  VisuallyHidden,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useCreateConnection from '../../lib/mutations/useCreateConnection';
import useUpdateConnection from '../../lib/mutations/useUpdateConnection';
import { searchUrls } from '../../lib/dal';
import { IoMdLink } from 'react-icons/io';
import { ConnectionWithSourceAndTarget } from '@semble/types';
import { BsExclamation } from 'react-icons/bs';

interface Props {
  onClose: () => void;
  sourceUrl: string;
  connectionToEdit?: {
    connection: ConnectionWithSourceAndTarget['connection'];
    targetUrl: string;
  };
}

const CONNECTION_TYPES = [
  { value: 'SUPPORTS', label: 'Supports' },
  { value: 'OPPOSES', label: 'Opposes' },
  { value: 'ADDRESSES', label: 'Addresses' },
  { value: 'HELPFUL', label: 'Helpful' },
  { value: 'LEADS_TO', label: 'Leads to' },
  { value: 'RELATED', label: 'Related' },
  { value: 'SUPPLEMENT', label: 'Supplement' },
  { value: 'EXPLAINER', label: 'Explainer' },
];

export default function AddConnectionForm(props: Props) {
  const createConnection = useCreateConnection();
  const updateConnection = useUpdateConnection();
  const isEditMode = !!props.connectionToEdit;

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [inputValue, setInputValue] = useState(
    props.connectionToEdit?.targetUrl || '',
  );
  const [debounced] = useDebouncedValue(inputValue, 200);

  const {
    data: searchResults,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['url search', debounced],
    queryFn: () =>
      searchUrls({
        searchQuery: debounced,
        limit: 10,
      }),
    enabled: debounced.trim().length > 0,
  });

  const urls = searchResults?.urls ?? [];
  const empty =
    !error && !isFetching && debounced.trim().length > 0 && urls.length === 0;

  const form = useForm({
    initialValues: {
      targetUrl: props.connectionToEdit?.targetUrl || '',
      connectionType: props.connectionToEdit?.connection.type || '',
      note: props.connectionToEdit?.connection.note || '',
    },
  });

  const MAX_NOTE_LENGTH = 500;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const values = form.getValues();

    if (isEditMode && props.connectionToEdit) {
      // Update existing connection
      updateConnection.mutate(
        {
          connectionId: props.connectionToEdit.connection.id,
          connectionType: values.connectionType
            ? (values.connectionType as any)
            : undefined,
          note: values.note || undefined,
        },
        {
          onSuccess: () => {
            props.onClose();
            notifications.show({
              message: 'Connection updated successfully',
              color: 'green',
            });
          },
          onError: () => {
            notifications.show({
              message: 'Could not update connection.',
              color: 'red',
              title: 'Error',
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
    } else {
      // Create new connection
      createConnection.mutate(
        {
          sourceUrl: props.sourceUrl,
          targetUrl: values.targetUrl,
          connectionType: values.connectionType
            ? (values.connectionType as any)
            : undefined,
          note: values.note || undefined,
        },
        {
          onSuccess: () => {
            props.onClose();
            notifications.show({
              message: 'Connection created successfully',
              color: 'green',
            });
          },
          onError: () => {
            notifications.show({
              message: 'Could not create connection.',
              color: 'red',
              title: 'Error',
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
    }
  };

  const options = urls.map((urlView) => (
    <Combobox.Option key={urlView.url} value={urlView.url} p={5}>
      <Group gap={'xs'} wrap="nowrap" align="flex-start">
        {urlView.metadata.imageUrl && (
          <Image
            src={urlView.metadata.imageUrl}
            alt={urlView.metadata.title || 'URL thumbnail'}
            w={60}
            h={60}
            radius="sm"
            fit="cover"
          />
        )}
        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={500} c={'bright'} lineClamp={1} size="sm">
            {urlView.metadata.title || urlView.url}
          </Text>
          {urlView.metadata.description && (
            <Text c={'dimmed'} lineClamp={2} size="xs">
              {urlView.metadata.description}
            </Text>
          )}
          <Text c={'gray'} lineClamp={1} size="xs">
            {urlView.url}
          </Text>
        </Stack>
      </Group>
    </Combobox.Option>
  ));

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={'xl'}>
        <Stack gap={4}>
          <Input.Label size="md" htmlFor="targetUrl" required>
            Target URL
          </Input.Label>
          <Combobox
            shadow="sm"
            radius={'md'}
            store={combobox}
            position="bottom-start"
            onOptionSubmit={(url) => {
              form.setFieldValue('targetUrl', url);
              setInputValue(url);
              combobox.closeDropdown();
            }}
          >
            <Combobox.Target>
              <Input
                id="targetUrl"
                component="input"
                type="url"
                placeholder="https://www.example.com or start typing to search for urls"
                value={inputValue}
                onChange={(e) => {
                  const val = e.currentTarget.value;
                  setInputValue(val);
                  form.setFieldValue('targetUrl', val);
                  combobox.openDropdown();
                }}
                onFocus={() => !isEditMode && combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
                leftSection={<IoMdLink size={22} />}
                rightSection={isFetching && <Loader size={18} />}
                variant="filled"
                size="md"
                required
                disabled={isEditMode}
              />
            </Combobox.Target>

            <Combobox.Dropdown hidden={debounced.trim().length === 0}>
              <Combobox.Options>
                <ScrollArea.Autosize type="scroll" mah={300}>
                  {isFetching && <Combobox.Empty>Searching...</Combobox.Empty>}
                  {error && (
                    <Combobox.Empty>Could not search for URLs</Combobox.Empty>
                  )}
                  {empty && <Combobox.Empty>No URLs found</Combobox.Empty>}
                  {options.length > 0 && options}
                </ScrollArea.Autosize>
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
        </Stack>

        <Select
          id="connectionType"
          label="Connection Type"
          placeholder="Select connection type (optional)"
          variant="filled"
          size="md"
          data={CONNECTION_TYPES}
          key={form.key('connectionType')}
          {...form.getInputProps('connectionType')}
          clearable
        />

        <Stack gap={0}>
          <Group justify="space-between">
            <Input.Label size="md" htmlFor="note">
              Note (optional)
            </Input.Label>
            <Text c={'gray'} aria-hidden>
              {form.getValues().note.length} / {MAX_NOTE_LENGTH}
            </Text>
          </Group>

          <Textarea
            id="note"
            placeholder="Add a note about this connection"
            variant="filled"
            size="md"
            rows={3}
            maxLength={MAX_NOTE_LENGTH}
            aria-describedby="note-char-remaining"
            key={form.key('note')}
            {...form.getInputProps('note')}
          />
          <VisuallyHidden id="note-char-remaining" aria-live="polite">
            {`${MAX_NOTE_LENGTH - form.getValues().note.length} characters remaining`}
          </VisuallyHidden>
        </Stack>

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
            loading={
              isEditMode
                ? updateConnection.isPending
                : createConnection.isPending
            }
          >
            {isEditMode ? 'Update connection' : 'Create connection'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
