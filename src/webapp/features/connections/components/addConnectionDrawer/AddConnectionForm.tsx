'use client';

import {
  Box,
  Button,
  Card,
  Center,
  Combobox,
  Divider,
  Group,
  Image,
  Input,
  Loader,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
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
import { ConnectionForUrl } from '@semble/types';
import {
  BiBlock,
  BiMessageSquareDetail,
  BiHelpCircle,
  BiRightArrowAlt,
  BiLink,
  BiBookContent,
  BiPlus,
  BiLike,
  BiCheckCircle,
  BiXCircle,
} from 'react-icons/bi';
import { MdOutlinePsychologyAlt } from 'react-icons/md';
import { createSembleClient } from '@/services/client.apiClient';
import { getDomain } from '@/lib/utils/link';
import { IoIosArrowDown } from 'react-icons/io';
import { PiNewspaperClipping } from 'react-icons/pi';

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
    icon: BiCheckCircle,
  },
  {
    value: 'OPPOSES',
    label: 'Opposes',
    description: 'Provides counter-evidence or opposing arguments',
    icon: BiXCircle,
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
    description: 'Leads to the next thing',
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
    icon: PiNewspaperClipping,
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
      <Group gap={'xs'} align="center">
        {urlView.metadata.imageUrl && (
          <Image
            src={urlView.metadata.imageUrl}
            alt={urlView.metadata.title || 'URL thumbnail'}
            w={35}
            h={35}
            radius="sm"
            fit="cover"
          />
        )}
        <Stack gap={0}>
          <Text fw={500} c={'bright'} lineClamp={1} size="sm">
            {urlView.metadata.title || urlView.url}
          </Text>
          <Text c={'gray'} lineClamp={1} size="xs">
            {getDomain(urlView.url)}
          </Text>
        </Stack>
      </Group>
    </Combobox.Option>
  ));

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={'lg'}>
        <Stack gap={0}>
          <Stack gap={0}>
            <Card padding="xs" radius="md" withBorder>
              <Group gap="xs">
                {sourceUrlMetadata?.metadata?.imageUrl && (
                  <Image
                    src={sourceUrlMetadata.metadata.imageUrl}
                    alt={sourceUrlMetadata.metadata.title || 'URL thumbnail'}
                    w={35}
                    h={35}
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
              <Input.Label htmlFor="sourceUrl">From</Input.Label>
            </VisuallyHidden>
          </Stack>

          <Divider orientation="vertical" size={'sm'} h={25} mx={'auto'} />

          <Stack gap={'md'} align="center">
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
                  variant="light"
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
                      const isSelected =
                        form.values.connectionType === type.value;
                      return (
                        <Combobox.Option
                          key={type.value}
                          value={type.value}
                          p={8}
                          bg={
                            isSelected
                              ? 'var(--mantine-color-green-light)'
                              : undefined
                          }
                        >
                          <Group gap="sm" wrap="nowrap">
                            {Icon && <Icon size={20} />}
                            <Stack gap={0} style={{ flex: 1 }}>
                              <Text size="sm" fw={isSelected ? 600 : 500}>
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
          </Stack>

          <Divider
            variant="dashed"
            orientation="vertical"
            size={'sm'}
            h={25}
            mx={'auto'}
          />

          <ThemeIcon
            variant="light"
            size={'sm'}
            mx={'auto'}
            color={'gray'}
            radius={'xl'}
          >
            <IoIosArrowDown size={16} />
          </ThemeIcon>

          <Card padding="xs" radius="md" withBorder>
            <Stack gap={0}>
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
                    placeholder="Search cards or add a URL"
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
                    variant="unstyled"
                    size="xs"
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
                    <ScrollArea.Autosize
                      type="scroll"
                      mah={300}
                      offsetScrollbars={'y'}
                    >
                      {isFetching && (
                        <Combobox.Empty>Searching...</Combobox.Empty>
                      )}
                      {error && (
                        <Combobox.Empty>
                          Could not search for URLs
                        </Combobox.Empty>
                      )}
                      {!isFetching && !error && (
                        <>
                          <Combobox.Option value={inputValue}>
                            <Group gap="xs" wrap="nowrap" p={0}>
                              <ThemeIcon
                                radius={'xl'}
                                size={'sm'}
                                variant="light"
                                color="gray"
                              >
                                <BiPlus />
                              </ThemeIcon>
                              <Stack gap={0} style={{ flex: 1 }}>
                                <Text size="sm" fw={600}>
                                  Add this URL
                                </Text>
                                <Text size="xs" c="dimmed" lineClamp={1}>
                                  {inputValue}
                                </Text>
                              </Stack>
                            </Group>
                          </Combobox.Option>
                          {options.length > 0 && (
                            <Divider
                              my={0}
                              label="or choose a card"
                              labelPosition="center"
                              variant="dashed"
                            />
                          )}
                        </>
                      )}
                      {options.length > 0 && <>{options}</>}
                      {/*{empty && <Combobox.Empty>No cards found</Combobox.Empty>}*/}
                    </ScrollArea.Autosize>
                  </Combobox.Options>
                </Combobox.Dropdown>
              </Combobox>
              <VisuallyHidden>
                <Input.Label htmlFor="targetUrl" required>
                  To
                </Input.Label>
              </VisuallyHidden>
            </Stack>
          </Card>
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
            {isEditMode ? 'Update' : 'Create'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
