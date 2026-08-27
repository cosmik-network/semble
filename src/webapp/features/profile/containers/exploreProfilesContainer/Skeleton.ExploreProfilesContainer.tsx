import { SimpleGrid, Skeleton, Stack } from '@mantine/core';
import SuggestionCardSkeleton from '@/features/onboarding/components/suggestionCard/Skeleton.SuggestionCard';

export function ExploreProfilesListSkeleton() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xs">
      {Array.from({ length: 9 }).map((_, i) => (
        <SuggestionCardSkeleton key={i} />
      ))}
    </SimpleGrid>
  );
}

export default function ExploreProfilesContainerSkeleton() {
  return (
    <Stack>
      <Skeleton h={36} w={220} radius="lg" />
      <ExploreProfilesListSkeleton />
    </Stack>
  );
}
