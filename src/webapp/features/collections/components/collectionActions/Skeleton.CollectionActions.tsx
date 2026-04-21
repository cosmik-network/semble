import { Group, Skeleton } from '@mantine/core';

export default function CollectionActionsSkeleton() {
  return (
    <Group gap={'xs'}>
      <Skeleton w={34} h={34} radius={'xl'} />
      <Skeleton w={34} h={34} radius={'xl'} />
      <Skeleton w={34} h={34} radius={'xl'} />
    </Group>
  );
}
