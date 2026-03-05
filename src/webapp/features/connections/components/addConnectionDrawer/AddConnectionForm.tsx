'use client';

import {
  Button,
  Card,
  Combobox,
  Group,
  Image,
  Input,
  Loader,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  Timeline,
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
import { ConnectionForUrl } from '@semble/types';
import {
  BiSupport,
  BiBlock,
  BiMessageSquareDetail,
  BiHelpCircle,
  BiRightArrowAlt,
  BiLink,
  BiBookContent,
  BiInfoCircle,
} from 'react-icons/bi';
import { MdOutlinePsychologyAlt } from 'react-icons/md';
import { TbArrowsExchange2 } from 'react-icons/tb';
import { createSembleClient } from '@/services/client.apiClient';
import { getDomain } from '@/lib/utils/link';

interface Props {
  onClose: () => void;
  sourceUrl: string;
  connectionToEdit?: {
    connection: ConnectionForUrl['connection'];
    targetUrl: string;
  };
}

const CONNECTION_TYPES = [
  {
    value: 'SUPPORTS',
    label: 'Supports',
    description: 'Provides evidence or arguments in favor',
    icon: BiSupport,
  },
  {
    value: 'OPPOSES',
    label: 'Opposes',
    description: 'Provides counter-evidence or opposing arguments',
    icon: BiBlock,
  },
  {
    value: 'ADDRESSES',
    label: 'Addresses',
    description: 'Responds to or answers a question or topic',
    icon: BiMessageSquareDetail,
  },
  {
    value: 'HELPFUL',
    label: 'Helpful',
    description: 'Provides useful context or background',
    icon: BiHelpCircle,
  },
  {
    value: 'LEADS_TO',
    label: 'Leads to',
    description: 'Logically or temporally precedes',
    icon: BiRightArrowAlt,
  },
  {
    value: 'RELATED',
    label: 'Related',
    description: 'Generally connected or associated',
    icon: BiLink,
  },
  {
    value: 'SUPPLEMENT',
    label: 'Supplement',
    description: 'Adds additional information or details',
    icon: BiBookContent,
  },
  {
    value: 'EXPLAINER',
    label: 'Explainer',
    description: 'Explains or clarifies concepts',
    icon: MdOutlinePsychologyAlt,
  },
];

export default function AddConnectionForm(props: Props) {
  const createConnection = useCreateConnection();
  const updateConnection = useUpdateConnection();
  const isEditMode = !!props.connectionToEdit;

  const urlCombobox = useCombobox({
    onDropdownClose: () => urlCombobox.resetSelectedOption(),
  });

  const typeCombobox = useCombobox({
    onDropdownClose: () => typeCombobox.resetSelectedOption(),
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

  const { data: sourceUrlMetadata } = useQuery({
    queryKey: ['url metadata', props.sourceUrl],
    queryFn: async () => {
      const client = createSembleClient();
      return client.getUrlMetadata(props.sourceUrl);
    },
    enabled: !!props.sourceUrl,
  });

  const urls = searchResults?.urls ?? [];
  const empty =
    !error && !isFetching && debounced.trim().length > 0 && urls.length === 0;

  const form = useForm({
    initialValues: {
      sourceUrl: props.sourceUrl,
      targetUrl: props.connectionToEdit?.targetUrl || '',
      connectionType: props.connectionToEdit?.connection.type || '',
      note: props.connectionToEdit?.connection.note || '',
    },
  });

  const MAX_NOTE_LENGTH = 500;

  const handleSwapUrls = () => {
    const currentSource = form.values.sourceUrl;
    const currentTarget = form.values.targetUrl;
    form.setFieldValue('sourceUrl', currentTarget);
    form.setFieldValue('targetUrl', currentSource);
    setInputValue(currentSource);
  };

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
        <Timeline active={1} bulletSize={22} lineWidth={2} color="gray">
          <Timeline.Item
            lineVariant="dashed"
            bullet={
              <Text fw={700} fz={'xs'}>
                1
              </Text>
            }
            title="Source URL"
          >
            <Stack gap={4} mt={4}>
              <Card padding="xs" radius="md" withBorder>
                <Group gap="xs" wrap="nowrap" align="flex-start">
                  {sourceUrlMetadata?.metadata?.imageUrl && (
                    <Image
                      src={sourceUrlMetadata.metadata.imageUrl}
                      alt={sourceUrlMetadata.metadata.title || 'URL thumbnail'}
                      w={40}
                      h={40}
                      radius="sm"
                      fit="cover"
                    />
                  )}
                  <Stack gap={0}>
                    <Text fw={600} size="sm" lineClamp={2}>
                      {sourceUrlMetadata?.metadata?.title || props.sourceUrl}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {getDomain(props.sourceUrl)}
                    </Text>
                  </Stack>
                </Group>
              </Card>
              <VisuallyHidden>
                <Input.Label htmlFor="sourceUrl">Source URL</Input.Label>
              </VisuallyHidden>
            </Stack>
          </Timeline.Item>

          <Timeline.Item
            bullet={
              <Text fw={700} fz={'xs'}>
                2
              </Text>
            }
            title="Target URL"
          >
            <Stack gap={4} mt={4}>
              <Combobox
                shadow="sm"
                radius={'md'}
                store={urlCombobox}
                position="bottom-start"
                onOptionSubmit={(url) => {
                  form.setFieldValue('targetUrl', url);
                  setInputValue(url);
                  urlCombobox.closeDropdown();
                }}
              >
                <Combobox.Target>
                  <Input
                    id="targetUrl"
                    component="input"
                    type="url"
                    placeholder="https://www.example.com or start typing to search"
                    value={inputValue}
                    onChange={(e) => {
                      const val = e.currentTarget.value;
                      setInputValue(val);
                      form.setFieldValue('targetUrl', val);
                      urlCombobox.openDropdown();
                    }}
                    onFocus={() => !isEditMode && urlCombobox.openDropdown()}
                    onBlur={() => urlCombobox.closeDropdown()}
                    rightSection={isFetching && <Loader size={18} />}
                    variant="filled"
                    size="md"
                    required
                    disabled={isEditMode}
                    styles={{
                      input: {
                        fontSize: '0.875rem',
                      },
                    }}
                  />
                </Combobox.Target>

                <Combobox.Dropdown hidden={debounced.trim().length === 0}>
                  <Combobox.Options>
                    <ScrollArea.Autosize type="scroll" mah={300}>
                      {isFetching && (
                        <Combobox.Empty>Searching...</Combobox.Empty>
                      )}
                      {error && (
                        <Combobox.Empty>
                          Could not search for URLs
                        </Combobox.Empty>
                      )}
                      {empty && <Combobox.Empty>No URLs found</Combobox.Empty>}
                      {options.length > 0 && options}
                    </ScrollArea.Autosize>
                  </Combobox.Options>
                </Combobox.Dropdown>
              </Combobox>
              <VisuallyHidden>
                <Input.Label htmlFor="targetUrl" required>
                  Target URL
                </Input.Label>
              </VisuallyHidden>
            </Stack>
          </Timeline.Item>
        </Timeline>

        <Stack gap={4}>
          <Input.Label size="md" htmlFor="connectionType">
            Connection Type
          </Input.Label>
          <Combobox
            shadow="sm"
            radius="md"
            store={typeCombobox}
            position="bottom-start"
            onOptionSubmit={(value) => {
              form.setFieldValue('connectionType', value);
              typeCombobox.closeDropdown();
            }}
          >
            <Combobox.Target>
              <Input
                id="connectionType"
                component="button"
                type="button"
                pointer
                rightSection={<Combobox.Chevron />}
                onClick={() => typeCombobox.toggleDropdown()}
                variant="filled"
                size="md"
              >
                {form.values.connectionType ? (
                  (() => {
                    const selectedType = CONNECTION_TYPES.find(
                      (t) => t.value === form.values.connectionType,
                    );
                    const Icon = selectedType?.icon;
                    return (
                      <Group gap="xs">
                        {Icon && <Icon size={18} />}
                        <Text>{selectedType?.label}</Text>
                      </Group>
                    );
                  })()
                ) : (
                  <Text c="dimmed">Select connection type</Text>
                )}
              </Input>
            </Combobox.Target>

            <Combobox.Dropdown>
              <Combobox.Options>
                {CONNECTION_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <Combobox.Option key={type.value} value={type.value} p={8}>
                      <Group gap="sm" wrap="nowrap">
                        {Icon && <Icon size={20} />}
                        <Stack gap={0} style={{ flex: 1 }}>
                          <Text size="sm" fw={500}>
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
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
        </Stack>

        <Stack gap={0}>
          <Group justify="space-between">
            <Input.Label size="md" htmlFor="note">
              How is this related?
            </Input.Label>
            <Text c={'gray'} aria-hidden>
              {form.getValues().note.length} / {MAX_NOTE_LENGTH}
            </Text>
          </Group>

          <Textarea
            id="note"
            placeholder={
              form.values.connectionType
                ? (() => {
                    const selectedType = CONNECTION_TYPES.find(
                      (t) => t.value === form.values.connectionType,
                    );
                    switch (selectedType?.value) {
                      case 'SUPPORTS':
                        return 'Explain how this supports or provides evidence...';
                      case 'OPPOSES':
                        return 'Describe the counter-argument or opposing view...';
                      case 'ADDRESSES':
                        return 'Explain how this responds to or answers the topic...';
                      case 'HELPFUL':
                        return 'Describe what context or background this provides...';
                      case 'LEADS_TO':
                        return 'Explain the logical or temporal connection...';
                      case 'RELATED':
                        return 'Describe how these are connected...';
                      case 'SUPPLEMENT':
                        return 'Explain what additional information this adds...';
                      case 'EXPLAINER':
                        return 'Describe what concepts this clarifies...';
                      default:
                        return 'Explain the relationship between these resources...';
                    }
                  })()
                : 'Explain the relationship between these resources...'
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
