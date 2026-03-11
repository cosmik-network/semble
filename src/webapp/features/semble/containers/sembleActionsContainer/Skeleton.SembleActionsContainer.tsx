import { Group, Skeleton, Stack } from '@mantine/core';

export default function SembleActionsContainerSkeleton() {
  return (
    <Stack gap="sm" align="center">
      <Group gap="xs">
        <Skeleton w={44} h={44} circle />
        <Skeleton w={95} h={44} radius="xl" />
      </Group>
    </Stack>
  );
}
