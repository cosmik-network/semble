import { Skeleton, Stack } from '@mantine/core';
import { HiOutlineUsers } from 'react-icons/hi';
import SuggestionCardSkeleton from '@/features/onboarding/components/suggestionCard/Skeleton.SuggestionCard';
import ExploreSectionHeader from '../exploreSectionHeader/ExploreSectionHeader';
import ExploreScroller from '../exploreScroller/ExploreScroller';
import { EXPLORE_ROUTES } from '../../lib/exploreRoutes';

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
    <Stack>
      <ExploreSectionHeader
        icon={<HiOutlineUsers size={22} />}
        title="Profiles"
        subtitle="People you might want to follow"
        viewAllHref={EXPLORE_ROUTES.profiles}
      />
      <Skeleton h={36} w={220} radius="lg" />
      <ExploreProfilesListSkeleton />
    </Stack>
  );
}
