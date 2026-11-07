import { Box, Group, Paper, Skeleton, Text } from '@mantine/core';
import { BOARD_TOOLS, TOOLBAR_VISIBLE_TOOLS } from '../../model/boardTools';
import classes from './Skeleton.CanvasBoard.module.css';

interface Props {
  // What the board is loading, shown in its middle
  progress?: string;
}

// The board's header, navigation and toolbar where tldraw puts them
export default function CanvasBoardSkeleton(props: Props) {
  return (
    <Box pos="absolute" inset={0} className={classes.board}>
      <Paper
        withBorder
        shadow="sm"
        radius="xl"
        p={4}
        pr="xs"
        m="xs"
        pos="absolute"
      >
        <Group gap="xs" wrap="nowrap">
          <Skeleton circle height={34} />
          <Skeleton height={14} width={120} radius="xl" />
        </Group>
      </Paper>

      {props.progress && (
        <Text c="dimmed" fz="sm" className={classes.progress}>
          {props.progress}
        </Text>
      )}

      <Group
        gap="xs"
        m="xs"
        pos="absolute"
        bottom={0}
        left={0}
        visibleFrom="md"
        wrap="nowrap"
      >
        <Skeleton height={44} width={88} radius="xl" />
        {[3, 2, 1].map((buttons) => (
          <Paper key={buttons} withBorder shadow="sm" radius="xl" p={4}>
            <Group gap={2} wrap="nowrap">
              {Array.from({ length: buttons }, (_, i) => (
                <Skeleton key={i} circle height={34} />
              ))}
            </Group>
          </Paper>
        ))}
      </Group>

      <Paper shadow="sm" radius="md" p={4} m="xs" className={classes.toolbar}>
        <Group gap={2} wrap="nowrap">
          {BOARD_TOOLS.slice(0, TOOLBAR_VISIBLE_TOOLS).map((tool) => (
            <Skeleton key={tool} height={36} width={36} radius="md" />
          ))}
          {BOARD_TOOLS.length > TOOLBAR_VISIBLE_TOOLS && (
            <Skeleton height={36} width={24} radius="md" />
          )}
        </Group>
      </Paper>
    </Box>
  );
}
