import { Group, Skeleton, Stack } from '@mantine/core';
import ExploreCardsRecommendedContentSkeleton from '../exploreCardsRecommendedContent/Skeleton.ExploreCardsRecommendedContent';

export default function ExploreCardsContainerSkeleton() {
  return (
    <Stack>
      <Group justify="space-between" gap={'xs'}>
        <Group gap={'xs'}>
          <Skeleton w={96} h={36} radius={'xl'} />
          <Skeleton w={36} h={36} radius={'xl'} />
        </Group>
        <Skeleton w={200} h={36} radius={'xl'} />
      </Group>

      <ExploreCardsRecommendedContentSkeleton />
    </Stack>
  );
}
