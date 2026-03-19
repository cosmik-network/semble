import { Group, Skeleton, Stack } from '@mantine/core';

export default function SembleActionsContainerSkeleton() {
  return (
    <Stack gap="sm" align="center">
      <Group gap="xs">
        <Skeleton w={36} h={36} circle />
        <Skeleton w={113} h={36} radius="xl" />
      </Group>
    </Stack>
  );
}
