'use client';

import {
  Button,
  Group,
  Input,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  VisuallyHidden,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import useCreateConnection from '../../lib/mutations/useCreateConnection';
import { IoMdLink } from 'react-icons/io';

interface Props {
  onClose: () => void;
  sourceUrl: string;
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

  const form = useForm({
    initialValues: {
      targetUrl: '',
      connectionType: '',
      note: '',
    },
  });

  const MAX_NOTE_LENGTH = 500;

  const handleCreateConnection = (e: React.FormEvent) => {
    e.preventDefault();

    const values = form.getValues();

    createConnection.mutate(
      {
        sourceType: 'URL',
        sourceValue: props.sourceUrl,
        targetType: 'URL',
        targetValue: values.targetUrl,
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
          });
        },
        onSettled: () => {
          form.reset();
        },
      },
    );
  };

  return (
    <form onSubmit={handleCreateConnection}>
      <Stack gap={'xl'}>
        <TextInput
          id="targetUrl"
          label="Target URL"
          type="url"
          placeholder="https://www.example.com"
          variant="filled"
          required
          size="md"
          leftSection={<IoMdLink size={22} />}
          key={form.key('targetUrl')}
          {...form.getInputProps('targetUrl')}
        />

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
          <Button type="submit" size="md" loading={createConnection.isPending}>
            Create connection
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
