import { Group, Skeleton } from '@mantine/core';
import { STAT_CHIP_AVATAR_SIZE } from './CollectionStatChip';

interface Props {
  width?: number;
}

// Mirrors CollectionStatChip: an AvatarGroup (spacing 8) of up to three
// avatars, then count + label text.
export default function CollectionStatChipSkeleton(props: Props) {
  return (
    <Group gap={'xxs'} wrap="nowrap">
      <Group gap={0} wrap="nowrap">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            h={STAT_CHIP_AVATAR_SIZE}
            w={STAT_CHIP_AVATAR_SIZE}
            radius="md"
            ml={i === 0 ? 0 : -8}
          />
        ))}
      </Group>
      <Skeleton h={14} w={props.width ?? 90} radius="xl" />
    </Group>
  );
}
