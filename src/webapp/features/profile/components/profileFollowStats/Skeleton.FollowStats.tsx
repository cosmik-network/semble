import { Group, Skeleton } from '@mantine/core';

export default function FollowStatsSkeleton() {
  return (
    <Group gap="sm">
      <Skeleton height={20} width={100} />
      <Skeleton height={20} width={80} />
      <Skeleton height={20} width={150} />
    </Group>
  );
}
