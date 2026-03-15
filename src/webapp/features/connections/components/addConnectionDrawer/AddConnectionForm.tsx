'use client';

import {
  ActionIcon,
  Anchor,
  Button,
  Card,
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
  Tooltip,
  useCombobox,
  VisuallyHidden,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useCreateConnection from '../../lib/mutations/useCreateConnection';
import useUpdateConnection from '../../lib/mutations/useUpdateConnection';
import { searchUrls } from '../../lib/dal';
import { ConnectionForUrl } from '@semble/types';
import { BiPlus } from 'react-icons/bi';
import { createSembleClient } from '@/services/client.apiClient';
import { getDomain } from '@/lib/utils/link';
import { IoIosArrowDown } from 'react-icons/io';
import { LuChevronsUpDown, LuArrowUpDown } from 'react-icons/lu';
import { CONNECTION_TYPES } from '../../const/connectionTypes';
import Link from 'next/link';

interface Props {
  onClose: () => void;
  sourceUrl: string;
  connectionToEdit?: {
    connection: ConnectionForUrl['connection'];
    targetUrl: string;
  };
}

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

  const urls = searchResults?.urls ?? [];
  const empty =
    !error && !isFetching && debounced.trim().length > 0 && urls.length === 0;

  const form = useForm({
    initialValues: {
      sourceUrl: props.sourceUrl,
      targetUrl: props.connectionToEdit?.targetUrl || '',
      connectionType: props.connectionToEdit?.connection.type || 'RELATED',
      note: props.connectionToEdit?.connection.note || '',
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

  const { data: sourceUrlMetadata } = useQuery({
    queryKey: ['url metadata', form.values.sourceUrl],
    queryFn: async () => {
      const client = createSembleClient();
      return client.getUrlMetadata({ url: form.values.sourceUrl });
    },
    enabled: !!form.values.sourceUrl,
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
            });
          },
          onError: () => {
            notifications.show({
              message: 'Could not update connection.',
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
            });
          },
          onError: () => {
            notifications.show({
              message: 'Could not create connection.',
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
      <Group gap={'xs'} align="center" wrap="nowrap">
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
            <Card withBorder component="article" p={'xs'} radius={'lg'}>
              <Group gap="xs" wrap="nowrap">
                {sourceUrlMetadata?.metadata?.imageUrl && (
                  <Image
                    src={sourceUrlMetadata.metadata.imageUrl}
                    alt={`${sourceUrlMetadata.metadata.title} social preview image`}
                    radius={'md'}
                    w={45}
                    h={45}
                  />
                )}
                <Stack gap={0}>
                  <Text fw={500} lineClamp={1} c={'bright'}>
                    {sourceUrlMetadata?.metadata?.title ||
                      form.values.sourceUrl}
                  </Text>
                  <Tooltip label={form.values.sourceUrl}>
                    <Anchor
                      component={Link}
                      href={form.values.sourceUrl}
                      target="_blank"
                      c={'gray'}
                      fz={'sm'}
                      lineClamp={1}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {getDomain(form.values.sourceUrl)}
                    </Anchor>
                  </Tooltip>
                </Stack>
              </Group>
            </Card>
            <VisuallyHidden>
              <Input.Label htmlFor="sourceUrl">From</Input.Label>
            </VisuallyHidden>
          </Stack>

          <Divider orientation="vertical" size={'md'} h={20} mx={'auto'} />

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
                        const isSelected =
                          form.values.connectionType === type.value;
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

          <Stack align="center" gap={0}>
            <Divider orientation="vertical" size={'md'} h={20} mx={'auto'} />

            <ThemeIcon variant="light" size={'xs'} color={'gray'} radius={'xl'}>
              <IoIosArrowDown size={12} />
            </ThemeIcon>
          </Stack>

          <Card padding="xs" radius="lg" withBorder>
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
                    type="text"
                    placeholder="Search cards or add a link"
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
                    error={form.errors.targetUrl}
                    styles={{
                      input: {
                        fontSize: 'var(--mantine-font-size-sm)',
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
                        <Fragment>
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
                                <Text size="sm" fw={600} c={'bright'}>
                                  Add this link
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
                        </Fragment>
                      )}
                      {options.length > 0 && <Fragment>{options}</Fragment>}
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
          {form.errors.targetUrl && (
            <Text size="sm" c="red" mt="xs">
              {form.errors.targetUrl}
            </Text>
          )}
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
