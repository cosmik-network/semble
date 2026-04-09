'use client';

import {
  ActionIcon,
  Button,
  Card,
  Combobox,
  Divider,
  Group,
  Input,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Tooltip,
  useCombobox,
  VisuallyHidden,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRef } from 'react';
import useCreateConnection from '../../lib/mutations/useCreateConnection';
import {} from 'react-icons/io';
import { LuChevronsUpDown, LuArrowUpDown } from 'react-icons/lu';
import { CONNECTION_TYPES } from '../../const/connectionTypes';
import UrlSearchInput from './UrlSearchInput';
import SourceCardPreview from './SourceCardPreview';
import { BsCheck, BsExclamation } from 'react-icons/bs';
import { BiSolidChevronDown } from 'react-icons/bi';

interface Props {
  onClose: () => void;
  /** When provided the source is fixed (connecting from a card). When omitted both URLs are searchable. */
  sourceUrl?: string;
}

export default function AddConnectionForm(props: Props) {
  const hasFixedSource = !!props.sourceUrl;
  const createConnection = useCreateConnection();

  // Track the raw input values so we can auto-confirm valid URLs on submit
  const rawSourceInput = useRef(props.sourceUrl ?? '');
  const rawTargetInput = useRef('');

  const typeCombobox = useCombobox({
    onDropdownClose: () => typeCombobox.resetSelectedOption(),
  });

  const form = useForm({
    initialValues: {
      sourceUrl: props.sourceUrl ?? '',
      targetUrl: '',
      connectionType: 'RELATED',
      note: '',
    },
    validateInputOnChange: false,
    validateInputOnBlur: true,
    validate: {
      sourceUrl: (value) => {
        if (!value || value.trim() === '') {
          return 'Source URL is required';
        }
        try {
          new URL(value);
          return null;
        } catch {
          return 'Please enter a valid URL';
        }
      },
      targetUrl: (value) => {
        if (!value || value.trim() === '') {
          return 'Please enter a URL';
        }
        try {
          new URL(value);
          return null;
        } catch {
          return 'Please enter a valid URL';
        }
      },
    },
  });

  const MAX_NOTE_LENGTH = 500;

  const handleSwapUrls = () => {
    const currentSource = form.values.sourceUrl;
    const currentTarget = form.values.targetUrl;
    form.setFieldValue('sourceUrl', currentTarget);
    form.setFieldValue('targetUrl', currentSource);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Auto-confirm valid URLs that were typed/pasted but not explicitly selected
    if (!form.values.sourceUrl && rawSourceInput.current) {
      try {
        new URL(rawSourceInput.current);
        form.setFieldValue('sourceUrl', rawSourceInput.current);
      } catch {
        // not a valid URL, let validation handle it
      }
    }
    if (!form.values.targetUrl && rawTargetInput.current) {
      try {
        new URL(rawTargetInput.current);
        form.setFieldValue('targetUrl', rawTargetInput.current);
      } catch {
        // not a valid URL, let validation handle it
      }
    }

    const validation = form.validate();
    if (validation.hasErrors) {
      return;
    }

    const values = form.getValues();

    if (values.sourceUrl === values.targetUrl) {
      notifications.show({
        id: 'same-url-error',
        title: 'A link cannot be connected to itself',
        message: 'Please choose a different link to connect',
      });
      return;
    }

    createConnection.mutate(
      {
        sourceUrl: values.sourceUrl,
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
            color: 'green',
            title: 'Success!',
            message: 'Connection created',
            position: 'top-center',
            loading: false,
            autoClose: 2000,
            icon: <BsCheck />,
          });
        },
        onError: () => {
          notifications.show({
            message: 'Could not create connection.',
            color: 'red',
            autoClose: 5000,
            withCloseButton: true,
            position: 'top-center',
            icon: <BsExclamation />,
          });
        },
        onSettled: () => {
          form.reset();
        },
      },
    );
  };

  // ---- Source slot ----
  const sourceSlot = hasFixedSource ? (
    <Stack gap={0}>
      <SourceCardPreview sourceUrl={form.values.sourceUrl} />
      <VisuallyHidden>
        <Input.Label htmlFor="sourceUrl">From</Input.Label>
      </VisuallyHidden>
    </Stack>
  ) : (
    <Stack gap={0}>
      <UrlSearchInput
        id="sourceUrl"
        label="From"
        placeholder="Search cards or paste a link"
        value={form.values.sourceUrl}
        error={form.errors.sourceUrl}
        onUrlSelect={(url) => form.setFieldValue('sourceUrl', url)}
        onInputChange={(raw) => {
          rawSourceInput.current = raw;
        }}
      />
      {form.errors.sourceUrl && (
        <Text size="sm" c="red" mt="xs">
          {form.errors.sourceUrl}
        </Text>
      )}
    </Stack>
  );

  // ---- Target slot ----
  const targetSlot = (
    <Stack gap={0}>
      <UrlSearchInput
        id="targetUrl"
        label="To"
        placeholder="Search cards or paste a link"
        value={form.values.targetUrl}
        error={form.errors.targetUrl}
        onUrlSelect={(url) => form.setFieldValue('targetUrl', url)}
        onInputChange={(raw) => {
          rawTargetInput.current = raw;
        }}
      />
      {form.errors.targetUrl && (
        <Text size="sm" c="red" mt="xs">
          {form.errors.targetUrl}
        </Text>
      )}
    </Stack>
  );

  // ---- Connection type selector ----
  const connectionTypeSelector = (
    <Card
      radius="xl"
      bg="var(--mantine-color-default-hover)"
      p="xs"
      w="fit-content"
      mx="auto"
    >
      <Group gap={'xs'} align="center" justify="center">
        <Combobox
          shadow="sm"
          radius="md"
          store={typeCombobox}
          position="bottom"
          width={320}
          onOptionSubmit={(value) => {
            form.setFieldValue('connectionType', value);
            typeCombobox.closeDropdown();
          }}
        >
          <Combobox.Target>
            <Button
              color="green"
              size="sm"
              onClick={() => typeCombobox.toggleDropdown()}
              leftSection={
                form.values.connectionType
                  ? (() => {
                      const selectedType = CONNECTION_TYPES.find(
                        (t) => t.value === form.values.connectionType,
                      );
                      const Icon = selectedType?.icon;
                      return Icon ? <Icon size={16} /> : null;
                    })()
                  : null
              }
              rightSection={<LuChevronsUpDown />}
            >
              {form.values.connectionType
                ? CONNECTION_TYPES.find(
                    (t) => t.value === form.values.connectionType,
                  )?.label
                : 'Select a relation'}
            </Button>
          </Combobox.Target>
          <Combobox.Dropdown>
            <Combobox.Options>
              <ScrollArea.Autosize type="scroll" mah={300}>
                {CONNECTION_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = form.values.connectionType === type.value;
                  return (
                    <Combobox.Option
                      key={type.value}
                      value={type.value}
                      p={5}
                      bg={
                        isSelected
                          ? 'var(--mantine-color-green-light)'
                          : undefined
                      }
                    >
                      <Group gap="sm" wrap="nowrap">
                        {Icon && <Icon size={20} color="green" />}
                        <Stack gap={0} style={{ flex: 1 }}>
                          <Text
                            size="sm"
                            c={'bright'}
                            fw={isSelected ? 600 : 500}
                          >
                            {type.label}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {type.description}
                          </Text>
                        </Stack>
                      </Group>
                    </Combobox.Option>
                  );
                })}
              </ScrollArea.Autosize>
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>

        <Tooltip
          label={
            form.values.targetUrl
              ? 'Swap'
              : 'You need to add a link before swapping'
          }
          position="top"
        >
          <ActionIcon
            variant="light"
            size={'lg'}
            color={'blue'}
            radius={'xl'}
            onClick={handleSwapUrls}
            disabled={!form.values.targetUrl}
            title={
              form.values.targetUrl
                ? 'Swap'
                : 'You need to add a link before swapping'
            }
          >
            <LuArrowUpDown size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Card>
  );

  return (
    <form
      onSubmit={handleSubmit}
      style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <Stack gap={'lg'} style={{ flex: 1 }}>
        {/* Source → Type selector → Target (single layout for both modes) */}
        <Stack gap={0}>
          {sourceSlot}

          <Divider orientation="vertical" size={'md'} h={20} mx={'auto'} />

          {connectionTypeSelector}

          <Stack align="center" gap={0}>
            <Divider orientation="vertical" size={'md'} h={20} mx={'auto'} />

            <ThemeIcon
              size={'xs'}
              color={'var(--mantine-color-disabled-border)'}
              c={'gray'}
              radius={'xl'}
            >
              <BiSolidChevronDown size={12} />
            </ThemeIcon>
          </Stack>

          {targetSlot}
        </Stack>

        <Stack gap={0}>
          <Group justify="space-between">
            <Input.Label size="md" htmlFor="note">
              Note
            </Input.Label>
            <Text c={'gray'} aria-hidden>
              {form.getValues().note.length} / {MAX_NOTE_LENGTH}
            </Text>
          </Group>

          <Textarea
            id="note"
            placeholder={
              CONNECTION_TYPES.find(
                (t) => t.value === form.values.connectionType,
              )?.notePlaceholder ??
              'Explain the relationship between these resources...'
            }
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

        <Group justify="space-between" gap={'xs'} grow mt="auto" mb="md">
          <Button
            variant="light"
            size="md"
            color={'gray'}
            onClick={props.onClose}
          >
            Cancel
          </Button>
          <Button type="submit" size="md" loading={createConnection.isPending}>
            Create
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
