import { Group, Skeleton } from '@mantine/core';

const textLineHeight =
  'calc(var(--mantine-font-size-md) * var(--mantine-line-height))';

export default function FollowStatsSkeleton() {
  return (
    <Group gap="sm">
      <Skeleton height={textLineHeight} width={100} />
      <Skeleton height={textLineHeight} width={80} />
      <Skeleton height={textLineHeight} width={150} />
    </Group>
  );
}
