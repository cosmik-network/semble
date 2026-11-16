import { Box, Group, Paper, Skeleton } from '@mantine/core';
import classes from '../canvasBoard/Skeleton.CanvasBoard.module.css';
import { PADDING, RADIUS } from '../sharedHeader/SharedHeader';

// tldraw's read-only toolbar: select, hand and laser
const READONLY_TOOLS = 3;

// The shared header, logo card and toolbar where tldraw puts them
export default function SharedCanvasBoardSkeleton() {
  return (
    <Box pos="absolute" inset={0} className={classes.board}>
      <Group gap={6} wrap="nowrap" m="xs" pos="absolute" top={0} left={0}>
        <Paper withBorder shadow="sm" radius={RADIUS} p={PADDING}>
          <Group gap={8} wrap="nowrap">
            <Skeleton height={28} width={28} radius="md" />
            <Skeleton height={14} width={120} radius="sm" />
            <Skeleton height={22} width={22} radius="md" />
          </Group>
        </Paper>
        <Paper withBorder shadow="sm" radius={RADIUS} p={PADDING}>
          <Skeleton height={28} width={28} radius="md" />
        </Paper>
      </Group>

      <Paper
        withBorder
        shadow="sm"
        radius={RADIUS}
        py={9}
        px={12}
        m="xs"
        pos="absolute"
        top={0}
        right={0}
      >
        <Skeleton height={22} width={16} radius="sm" />
      </Paper>

      <Paper shadow="sm" radius="md" p={4} m="xs" className={classes.toolbar}>
        <Group gap={2} wrap="nowrap">
          {Array.from({ length: READONLY_TOOLS }, (_, i) => (
            <Skeleton key={i} height={36} width={36} radius="md" />
          ))}
        </Group>
      </Paper>
    </Box>
  );
}
