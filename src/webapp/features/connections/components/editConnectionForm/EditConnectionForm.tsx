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
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Tooltip,
  VisuallyHidden,
  useCombobox,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useQuery } from '@tanstack/react-query';
import useUpdateConnection from '../../lib/mutations/useUpdateConnection';
import { createSembleClient } from '@/services/client.apiClient';
import { getDomain } from '@/lib/utils/link';
import { IoIosArrowDown } from 'react-icons/io';
import { LuChevronsUpDown, LuArrowUpDown } from 'react-icons/lu';
import { CONNECTION_TYPES } from '../../const/connectionTypes';
import Link from 'next/link';
import { BsCheck, BsExclamation } from 'react-icons/bs';
import { ConnectionWithSourceAndTarget } from '@semble/types';

interface Props {
  onClose: () => void;
  sourceUrl: string;
  targetUrl: string;
  connection: ConnectionWithSourceAndTarget['connection'];
}

export default function EditConnectionForm(props: Props) {
  const updateConnection = useUpdateConnection();

  const typeCombobox = useCombobox({
    onDropdownClose: () => typeCombobox.resetSelectedOption(),
  });

  const form = useForm({
    initialValues: {
      sourceUrl: props.sourceUrl,
      targetUrl: props.targetUrl,
      connectionType: props.connection.type || 'RELATED',
      note: props.connection.note || '',
      swapped: false,
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

  const { data: sourceUrlMetadata, isLoading: isLoadingSourceMetadata } =
    useQuery({
      queryKey: ['url metadata', form.values.sourceUrl],
      queryFn: async () => {
        const client = createSembleClient();
        return client.getUrlMetadata({ url: form.values.sourceUrl });
      },
      enabled: !!form.values.sourceUrl,
    });

  const { data: targetUrlMetadata, isLoading: isLoadingTargetMetadata } =
    useQuery({
      queryKey: ['url metadata', form.values.targetUrl],
      queryFn: async () => {
        const client = createSembleClient();
        return client.getUrlMetadata({ url: form.values.targetUrl });
      },
      enabled: !!form.values.targetUrl,
    });

  const MAX_NOTE_LENGTH = 500;

  const handleSwapUrls = () => {
    const currentSource = form.values.sourceUrl;
    const currentTarget = form.values.targetUrl;
    form.setFieldValue('sourceUrl', currentTarget);
    form.setFieldValue('targetUrl', currentSource);
    form.setFieldValue('swapped', !form.values.swapped);
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
        color: 'red',
        autoClose: 5000,
        withCloseButton: true,
        position: 'top-center',
        icon: <BsExclamation />,
      });
      return;
    }

    updateConnection.mutate(
      {
        connectionId: props.connection.id,
        connectionType: values.connectionType
          ? (values.connectionType as any)
          : undefined,
        note: values.note || undefined,
        swap: values.swapped,
      },
      {
        onSuccess: () => {
          props.onClose();
          notifications.show({
            color: 'green',
            title: 'Success!',
            message: 'Connection updated',
            position: 'top-center',
            loading: false,
            autoClose: 2000,
            icon: <BsCheck />,
          });
        },
        onError: () => {
          notifications.show({
            message: 'Could not update connection.',
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

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={'lg'}>
        <Stack gap={0}>
          <Stack gap={0}>
            <Card withBorder component="article" p={'xs'} radius={'lg'}>
              <Group gap="xs" wrap="nowrap">
                {isLoadingSourceMetadata ? (
                  <Skeleton width={45} height={45} radius={'md'} />
                ) : (
                  sourceUrlMetadata?.metadata?.imageUrl && (
                    <Image
                      src={sourceUrlMetadata.metadata.imageUrl}
                      alt={`${sourceUrlMetadata.metadata.title} social preview image`}
                      radius={'md'}
                      w={45}
                      h={45}
                    />
                  )
                )}
                <Stack gap={0}>
                  <Skeleton visible={isLoadingSourceMetadata}>
                    <Text fw={500} lineClamp={1} c={'bright'}>
                      {sourceUrlMetadata?.metadata?.title ||
                        form.values.sourceUrl}
                    </Text>
                  </Skeleton>
                  <Skeleton visible={isLoadingSourceMetadata} mt={4}>
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
                  </Skeleton>
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

              <Tooltip label="Swap" position="top">
                <ActionIcon
                  variant="light"
                  size={'lg'}
                  color={'blue'}
                  radius={'xl'}
                  onClick={handleSwapUrls}
                  title="Swap"
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
            <Group gap="xs" wrap="nowrap">
              {isLoadingTargetMetadata ? (
                <Skeleton width={45} height={45} radius={'md'} />
              ) : (
                targetUrlMetadata?.metadata?.imageUrl && (
                  <Image
                    src={targetUrlMetadata.metadata.imageUrl}
                    alt={`${targetUrlMetadata.metadata.title} social preview image`}
                    radius={'md'}
                    w={45}
                    h={45}
                  />
                )
              )}
              <Stack gap={0}>
                <Skeleton visible={isLoadingTargetMetadata}>
                  <Text fw={500} lineClamp={1} c={'bright'}>
                    {targetUrlMetadata?.metadata?.title ||
                      form.values.targetUrl}
                  </Text>
                </Skeleton>
                <Skeleton visible={isLoadingTargetMetadata} mt={4}>
                  <Tooltip label={form.values.targetUrl}>
                    <Anchor
                      component={Link}
                      href={form.values.targetUrl}
                      target="_blank"
                      c={'gray'}
                      fz={'sm'}
                      lineClamp={1}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {getDomain(form.values.targetUrl)}
                    </Anchor>
                  </Tooltip>
                </Skeleton>
              </Stack>
            </Group>
            <VisuallyHidden>
              <Input.Label htmlFor="targetUrl" required>
                To
              </Input.Label>
            </VisuallyHidden>
          </Card>
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
          <Button type="submit" size="md" loading={updateConnection.isPending}>
            Update
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
