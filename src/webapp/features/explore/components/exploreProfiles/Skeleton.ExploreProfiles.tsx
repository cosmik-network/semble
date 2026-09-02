import { Skeleton } from '@mantine/core';
import SuggestionCardSkeleton from '@/features/onboarding/components/suggestionCard/Skeleton.SuggestionCard';
import ExploreShelf from '../exploreShelf/ExploreShelf';
import ExploreScroller from '../exploreScroller/ExploreScroller';

export function ExploreProfilesListSkeleton() {
  return (
    <ExploreScroller>
      {Array.from({ length: 4 }).map((_, i) => (
        <SuggestionCardSkeleton key={i} />
      ))}
    </ExploreScroller>
  );
}

export default function ExploreProfilesSkeleton() {
  return (
    <ExploreShelf section="profiles">
      <Skeleton h={36} w={220} radius="lg" />
      <ExploreProfilesListSkeleton />
    </ExploreShelf>
  );
}
