'use client';

import { Container, SegmentedControl, Stack } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import useRecommendedCards from '@/features/cards/lib/queries/useRecommendedCards';
import useSeedUrls from '@/features/explore/lib/queries/useSeedUrls';
import useBskyFollowedUsers from '@/features/follows/lib/queries/useBskyFollowedUsers';
import { useAuth } from '@/hooks/useAuth';
import { getLoginPathWithRedirect } from '@/lib/auth/redirect';
import { EXPLORE_ROUTES } from '@/features/explore/lib/exploreRoutes';
import {
  ProfilesView,
  profileViewOptions,
} from '@/features/explore/lib/profilesView';
import ProfileSuggestionList from '../../components/profileSuggestionList/ProfileSuggestionList';
import { SuggestedUser } from '@/features/profile/components/profileSuggestionCard/ProfileSuggestionCard';
import ErrorState from '@/components/contentDisplay/errorState/ErrorState';
import useRecommendedUsers from '../../lib/queries/useRecommendedUsers';
import { ExploreProfilesListSkeleton } from './Skeleton.ExploreProfilesContainer';

const SEED_LIMIT = 10;
const BSKY_PAGE_SIZE = 20;

export default function ExploreProfilesContainer() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [view, setView] = useState<ProfilesView>('forYou');

  // Both sources require a session, so guests get bounced rather than shown
  // a page that can only 401.
  const isGuest = !isAuthLoading && !isAuthenticated;
  useEffect(() => {
    if (isGuest) {
      router.replace(getLoginPathWithRedirect(EXPLORE_ROUTES.profiles));
    }
  }, [isGuest, router]);

  // Recommendations are seeded from the reader's recommended card URLs, the
  // same way the explore shelf seeds them.
  const { data: seedData, isPending: isSeedPending } = useRecommendedCards({
    queries: [],
    limit: SEED_LIMIT,
    enabled: isAuthenticated && view === 'forYou',
  });

  // Falls back to network seeds when the reader's library yields none, so an
  // empty library still gets suggestions.
  const seedUrls = useSeedUrls({
    candidates: seedData?.pages[0]?.urls.map((u) => u.url),
    hasSettled: !isSeedPending,
  });

  const recommended = useRecommendedUsers({
    urls: seedUrls,
    enabled: view === 'forYou' && isAuthenticated,
  });

  // People already followed on Bluesky who are on Semble but not followed here.
  const bsky = useBskyFollowedUsers({
    limit: BSKY_PAGE_SIZE,
    enabled: view === 'bluesky' && isAuthenticated,
  });

  const isPending =
    isAuthLoading ||
    isGuest ||
    (view === 'bluesky' ? bsky.isPending : recommended.isPending);

  const error = view === 'bluesky' ? bsky.error : recommended.error;

  // Both views render the same card; each query tags followsOnBsky itself.
  const users: SuggestedUser[] =
    view === 'bluesky'
      ? (bsky.data?.pages.flatMap((page) => page.users) ?? [])
      : (recommended.data?.users ?? []);

  const list = (
    <ProfileSuggestionList
      layout="grid"
      users={users}
      emptyMessage={
        view === 'bluesky'
          ? 'No one from your Bluesky follows is here yet'
          : 'No profiles to suggest yet'
      }
    />
  );

  // Only the Bluesky list paginates; recommendations come back as one capped
  // set, and an empty list has nothing to scroll.
  const paginates = view === 'bluesky' && users.length > 0;

  const content = error ? (
    <ErrorState message="Could not load profiles" />
  ) : isPending ? (
    <ExploreProfilesListSkeleton />
  ) : paginates ? (
    <InfiniteScroll
      dataLength={users.length}
      hasMore={!!bsky.hasNextPage}
      isInitialLoading={bsky.isPending}
      isLoading={bsky.isFetchingNextPage}
      loadMore={bsky.fetchNextPage}
    >
      {list}
    </InfiniteScroll>
  ) : (
    list
  );

  return (
    <Container p="xs" size="xl">
      <Stack>
        <SegmentedControl
          value={view}
          onChange={(value) => setView(value as ProfilesView)}
          size="sm"
          radius="lg"
          w="fit-content"
          data={profileViewOptions}
        />

        {content}
      </Stack>
    </Container>
  );
}
