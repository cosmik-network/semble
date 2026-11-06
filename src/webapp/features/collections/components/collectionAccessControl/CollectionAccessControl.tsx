'use client';

import { CollectionAccessType } from '@semble/types';
import { Group, Stack, Switch, Text, ThemeIcon } from '@mantine/core';
import { FaSeedling } from 'react-icons/fa6';

interface Props {
  value: CollectionAccessType;
  onChange: (value: CollectionAccessType) => void;
  disabled?: boolean;
}

export default function CollectionAccessControl(props: Props) {
  const isOpen = props.value === CollectionAccessType.OPEN;

  return (
    <Group justify="space-between" wrap="nowrap">
      <Group gap="xs" wrap="nowrap">
        <ThemeIcon
          size="md"
          variant="light"
          color={isOpen ? 'green' : 'gray'}
          radius="xl"
        >
          <FaSeedling size={14} />
        </ThemeIcon>
        <Stack gap={0}>
          <Text fw={500} size="sm">
            Open collection
          </Text>
          <Text fw={500} c="gray" size="sm">
            Let anyone add cards
          </Text>
        </Stack>
      </Group>
      <Switch
        size="md"
        color="green"
        withThumbIndicator={false}
        aria-label="Open collection"
        disabled={props.disabled}
        checked={isOpen}
        onChange={(event) =>
          props.onChange(
            event.currentTarget.checked
              ? CollectionAccessType.OPEN
              : CollectionAccessType.CLOSED,
          )
        }
      />
    </Group>
  );
}
