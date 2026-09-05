import { Group, Skeleton } from '@mantine/core';
import { STAT_CHIP_AVATAR_SIZE, STAT_CHIP_PREVIEW_LIMIT } from './constants';
import classes from './StatChip.module.css';

interface Props {
  width?: number;
  /** Stats without an avatar preview show a single icon tile instead. */
  iconOnly?: boolean;
}

export default function StatChipSkeleton(props: Props) {
  const tiles = props.iconOnly ? 1 : STAT_CHIP_PREVIEW_LIMIT;

  return (
    <Group gap={'xxs'} justify="center" wrap="nowrap" className={classes.root}>
      <Group gap={0} wrap="nowrap">
        {Array.from({ length: tiles }).map((_, i) => (
          <Skeleton
            key={i}
            h={STAT_CHIP_AVATAR_SIZE}
            w={STAT_CHIP_AVATAR_SIZE}
            radius="sm"
            ml={i === 0 ? 0 : -8}
          />
        ))}
      </Group>
      <Skeleton h={14} my={4} w={props.width ?? 90} radius="xl" />
    </Group>
  );
}
