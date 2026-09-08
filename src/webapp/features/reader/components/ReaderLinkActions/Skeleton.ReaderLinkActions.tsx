import { Group, Skeleton, Stack } from '@mantine/core';

export default function ReaderLinkActionsSkeleton() {
  return (
    <Stack gap="sm">
      <Stack gap={6}>
        <Skeleton height={12} width="30%" radius="xl" />
        <Skeleton height={16} width="85%" radius="xl" />
      </Stack>
      <Group gap="xs" wrap="nowrap">
        <Skeleton height={30} width={48} radius="xl" />
        <Skeleton height={30} width={48} radius="xl" />
        <Skeleton height={30} width={80} radius="xl" />
      </Group>
    </Stack>
  );
}
