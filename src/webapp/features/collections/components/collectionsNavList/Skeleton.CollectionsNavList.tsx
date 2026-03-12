import { Group, Skeleton, Text, Stack } from '@mantine/core';

export default function CollectionsNavListSkeleton() {
  return (
    <Stack gap={'xs'}>
      <Group justify="space-between">
        <Text fw={600} c={'gray'}>
          Collections
        </Text>

        <Group gap={'xs'}>
          <Skeleton radius={'xl'} h={26} w={26} />
          <Skeleton radius={'xl'} h={26} w={26} />
        </Group>
      </Group>

      <Stack gap={0}>
        <Stack gap={5} my={'sm'}>
          <Skeleton h={40} w={'100%'} />
          <Skeleton h={40} w={'100%'} />
        </Stack>
      </Stack>
    </Stack>
  );
}
