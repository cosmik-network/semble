import { Card, Group, Skeleton, Stack } from '@mantine/core';
import ActivityCardSkeleton from '../activityCard/Skeleton.ActivityCard';

export default function RecentActivitySkeleton() {
  return (
    <Card withBorder component="article" p="xs" radius="lg">
      <Stack gap="md">
        <Group gap="xs" justify="space-between">
          <Skeleton w={220} h={28} />
          <Skeleton w={110} h={36} radius="xl" />
        </Group>
        <Stack gap="xl">
          <ActivityCardSkeleton />
          <ActivityCardSkeleton />
          <ActivityCardSkeleton />
        </Stack>
      </Stack>
    </Card>
  );
}
