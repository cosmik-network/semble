import { Stack, Skeleton, Group, Box, Card } from '@mantine/core';
import UrlAddedBySummarySkeleton from '@/features/semble/components/urlAddedBySummary/Skeleton.UrlAddedBySummary';
import SembleActionsContainerSkeleton from '@/features/semble/containers/sembleActionsContainer/Skeleton.SembleActionsContainer';

export default function BlueskySembleHeaderSkeleton() {
  return (
    <Stack gap="md" mx="auto" w={'100%'}>
      {/* "Semble" */}
      <Skeleton w={120} h={16} />

      {/* Post */}
      <Card radius={'lg'} withBorder>
        <Stack gap="xs" w={'100%'}>
          {/* Author row */}
          <Group gap="xs" justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <Skeleton circle h={40} w={40} />

              <Stack gap={6} flex={1}>
                <Skeleton w={130} h={16} />
                <Skeleton w={90} h={14} />
              </Stack>
            </Group>

            {/* Bluesky icon placeholder */}
            <Skeleton h={18} w={18} radius="xl" />
          </Group>

          {/* Post text + embed */}
          <Stack gap="xs" w="100%">
            <Box>
              <Stack gap={6}>
                <Skeleton w="90%" h={14} />
                <Skeleton w="85%" h={14} />
                <Skeleton w="95%" h={14} />
              </Stack>
            </Box>

            {/* Embed placeholder */}
            <Skeleton w="100%" h={180} radius="md" />
          </Stack>
        </Stack>
      </Card>

      <Stack gap={'xl'}>
        <SembleActionsContainerSkeleton />
        <UrlAddedBySummarySkeleton />
      </Stack>
    </Stack>
  );
}
