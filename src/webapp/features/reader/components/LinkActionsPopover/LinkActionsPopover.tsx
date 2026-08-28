'use client';

import { Button, Group, Paper, Text } from '@mantine/core';
import { FiPlus } from 'react-icons/fi';
import { TbPlugConnected } from 'react-icons/tb';
import { getDomain } from '@/lib/utils/link';
import type { HoveredLink } from '../../lib/useLinkInteractions';

interface Props {
  hovered: HoveredLink;
  onSave: () => void;
  onConnect: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const POPOVER_WIDTH = 240;

export default function LinkActionsPopover(props: Props) {
  const { rect } = props.hovered;
  const left = Math.max(
    8,
    Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8),
  );

  return (
    <Paper
      shadow="md"
      radius="lg"
      p="xs"
      withBorder
      w={POPOVER_WIDTH}
      style={{ position: 'fixed', top: rect.bottom + 6, left, zIndex: 10 }}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      <Text size="xs" c="dimmed" truncate mb={6} px={4}>
        {getDomain(props.hovered.link.href)}
      </Text>
      <Group gap="xs" grow>
        <Button
          variant="light"
          color="gray"
          size="xs"
          radius="xl"
          leftSection={<FiPlus size={14} />}
          onClick={props.onSave}
        >
          Save
        </Button>
        <Button
          variant="light"
          color="gray"
          size="xs"
          radius="xl"
          leftSection={<TbPlugConnected size={14} />}
          onClick={props.onConnect}
        >
          Connect
        </Button>
      </Group>
    </Paper>
  );
}
