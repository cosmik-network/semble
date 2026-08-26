'use client';

import useGlobalFeed from '@/features/feeds/lib/queries/useGlobalFeed';
import useFollowingFeed from '@/features/feeds/lib/queries/useFollowingFeed';
import useBskyFollowingFeed from '@/features/feeds/lib/queries/useBskyFollowingFeed';
import FeedItem from '@/features/feeds/components/feedItem/FeedItem';
import {
  Stack,
  Text,
  Center,
  Container,
  Box,
  Loader,
  Collapse,
} from '@mantine/core';
import MyFeedContainerSkeleton from './Skeleton.MyFeedContainer';
import MyFeedContainerError from './Error.MyFeedContainer';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import RefetchButton from '@/components/navigation/refetchButton/RefetchButton';
import { usePathname } from 'next/navigation';
import { CardSaveSource } from '@/features/analytics/types';
import { useState, useEffect, Suspense } from 'react';
import { UserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { useSettings } from '@/providers/settings';

const MIN_REFETCH_LOADER_MS = 400;

function MyFeedContent(props: { settings: UserSettings }) {
  const pathname = usePathname();
  const settings = props.settings;
  const selectedUrlType = settings.feedUrlType ?? undefined;
  const selectedSource = settings.feedSource ?? undefined;
  const selectedFeed = settings.feedView;
  const includeKnownBots = settings.includeKnownBots;

  const activityTypesFilter = settings.feedActivityType
    ? [settings.feedActivityType]
    : undefined;

  const globalFeed = useGlobalFeed({
    urlType: selectedUrlType,
    source: selectedSource,
    activityTypes: activityTypesFilter,
    includeKnownBots,
  });
  const followingFeed = useFollowingFeed({
    urlType: selectedUrlType,
    source: selectedSource,
    activityTypes: activityTypesFilter,
    includeKnownBots,
    enabled: selectedFeed === 'following',
  });

  const bskyFollowingFeed = useBskyFollowingFeed({
    urlType: selectedUrlType,
    source: selectedSource,
    activityTypes: activityTypesFilter,
    includeKnownBots,
    enabled: selectedFeed === 'bskyFollowing',
  });

  const activeFeed =
    selectedFeed === 'following'
      ? followingFeed
      : selectedFeed === 'bskyFollowing'
        ? bskyFollowingFeed
        : globalFeed;

  const {
    data,
    error,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
    refetch,
  } = activeFeed;

  // Visibility during the refetch itself is derived, not stored. Only the
  // tail — holding the loader open briefly after the refetch ends, so a fast
  // one still plays its animation instead of flashing — needs state.
  const [isHoldingLoader, setIsHoldingLoader] = useState(false);
  const [wasRefetching, setWasRefetching] = useState(isRefetching);

  // Adjusted during render (React's "derive from previous props" pattern)
  // rather than in an effect, which would leave the loader a frame behind.
  if (wasRefetching !== isRefetching) {
    setWasRefetching(isRefetching);
    if (!isRefetching) setIsHoldingLoader(true);
  }

  const showRefetchLoader = isRefetching || isHoldingLoader;

  useEffect(() => {
    if (!isHoldingLoader) return;

    const timer = setTimeout(
      () => setIsHoldingLoader(false),
      MIN_REFETCH_LOADER_MS,
    );
    return () => clearTimeout(timer);
  }, [isHoldingLoader]);

  const allActivities =
    data?.pages.flatMap((page) => page.activities ?? []) ?? [];

  if (isPending) {
    return <MyFeedContainerSkeleton />;
  }

  if (error) {
    return <MyFeedContainerError />;
  }

  return (
    <Container p="xs" size="xl">
      <Collapse expanded={showRefetchLoader} transitionDuration={350}>
        <Stack align="center" gap={'xs'}>
          <Loader size={'sm'} color={'gray'} />
          <Text fw={600} c={'gray'} mb={'sm'}>
            Fetching the latest activities...
          </Text>
        </Stack>
      </Collapse>
      {allActivities.length === 0 ? (
        <Center>
          <Text fz="h3" fw={600} c="gray">
            No activity to show yet
          </Text>
        </Center>
      ) : (
        <InfiniteScroll
          dataLength={allActivities.length}
          hasMore={!!hasNextPage}
          isInitialLoading={isPending}
          isLoading={isFetchingNextPage}
          loadMore={fetchNextPage}
        >
          <Stack gap={60} mx={'auto'} maw={600} w={'100%'}>
            {allActivities.map((item) => (
              <Box
                key={item.id}
                style={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: 'auto 400px',
                }}
              >
                <FeedItem
                  item={item}
                  analyticsContext={{
                    saveSource: CardSaveSource.FEED,
                    activeFilters: { urlType: selectedUrlType },
                    pagePath: pathname,
                  }}
                />
              </Box>
            ))}
          </Stack>
        </InfiniteScroll>
      )}

      <Box
        pos={'fixed'}
        bottom={0}
        mt={'md'}
        mx={{ base: 10, sm: 2.5 }}
        mb={{ base: 100, sm: 'md' }}
        style={{ zIndex: 2 }}
      >
        <RefetchButton onRefetch={() => refetch()} />
      </Box>
    </Container>
  );
}

export default function MyFeedContainer() {
  const { settings, isHydrated } = useSettings();

  // Until localStorage has been read, `settings` still holds the defaults.
  // Mounting the feed now would render the wrong feed for a frame and fire a
  // request for it. `useGlobalFeed` is a suspense query with no `enabled`
  // option, so withholding the mount is the only way to withhold the request.
  //
  // Only a hard load of this page reaches that state now: `useSettings` reads
  // the app-wide provider, which has already hydrated by the time anything
  // navigates here from inside the app.
  //
  // The settings still go down as a prop, which is now just a saved context
  // read — a child calling `useSettings()` would see the same hydrated value.
  if (!isHydrated) return <MyFeedContainerSkeleton />;

  // The suspense `useGlobalFeed` throws would otherwise bubble past this
  // container to the nearest ancestor boundary, blanking the page during a
  // client-side transition from explore.
  return (
    <Suspense fallback={<MyFeedContainerSkeleton />}>
      <MyFeedContent settings={settings} />
    </Suspense>
  );
}
