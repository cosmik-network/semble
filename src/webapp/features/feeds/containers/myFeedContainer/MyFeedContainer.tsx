'use client';

import useGlobalFeed from '@/features/feeds/lib/queries/useGlobalFeed';
import useFollowingFeed from '@/features/feeds/lib/queries/useFollowingFeed';
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
import { useState, useEffect } from 'react';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';

const MIN_REFETCH_LOADER_MS = 400;

export default function MyFeedContainer() {
  const pathname = usePathname();
  const { settings } = useUserSettings();
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

  const activeFeed = selectedFeed === 'following' ? followingFeed : globalFeed;

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

  // Hold the loader briefly so a fast refetch still plays its animation.
  const [showRefetchLoader, setShowRefetchLoader] = useState(false);

  useEffect(() => {
    if (isRefetching) {
      setShowRefetchLoader(true);
    } else if (showRefetchLoader) {
      const timer = setTimeout(
        () => setShowRefetchLoader(false),
        MIN_REFETCH_LOADER_MS,
      );
      return () => clearTimeout(timer);
    }
  }, [isRefetching, showRefetchLoader]);

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
