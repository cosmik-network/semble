import { Group, Paper } from '@mantine/core';
import type { CSSProperties, ReactNode } from 'react';
import { stopEventPropagation } from 'tldraw';

export const GAP = 8;
// Less room than this above what it's for puts the popup below it
export const ROOM_ABOVE = 80;

export const ICON_PROPS = {
  variant: 'light',
  color: 'gray',
  size: 'md',
  radius: 'xl',
} as const;

interface Props {
  // Where it sits in the viewport
  position: Pick<CSSProperties, 'left' | 'top' | 'transform'>;
  children: ReactNode;
}

// A row of buttons floating over the board
export default function BoardPopup(props: Props) {
  return (
    <Paper
      withBorder
      shadow="sm"
      radius="xl"
      p={6}
      pos="absolute"
      style={{
        ...props.position,
        zIndex: 'var(--layer-menus)',
        pointerEvents: 'all',
      }}
      onPointerDown={stopEventPropagation}
    >
      <Group gap={6} wrap="nowrap">
        {props.children}
      </Group>
    </Paper>
  );
}
