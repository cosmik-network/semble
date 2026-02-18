import { Stack, Group, Avatar, Skeleton } from '@mantine/core';

export default function BlueskyPostSkeleton() {
  return (
    <Stack justify="space-between" gap="xs">
      <Group gap="xs" justify="space-between" wrap="nowrap" w={'100%'}>
        <Group gap={'xs'} wrap="nowrap" w={'100%'}>
          <Avatar size={'sm'} radius="xl" />
          <Skeleton w={'70%'} h={14} />
        </Group>

        <Skeleton h={18} w={18} radius="xl" />
      </Group>
      <Stack w={'100%'} gap={5}>
        <Skeleton w={'100%'} h={10} />
        <Skeleton w={'100%'} h={10} />
        <Skeleton w={'100%'} h={10} />
      </Stack>
    </Stack>
  );
}
