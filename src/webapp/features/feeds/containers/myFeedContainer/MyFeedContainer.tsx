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
import { UrlType, ActivitySource, ActivityType } from '@semble/types';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { CardSaveSource } from '@/features/analytics/types';
import { useState, useEffect } from 'react';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';

export default function MyFeedContainer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { settings } = useUserSettings();
  const selectedUrlType = searchParams.get('type') as UrlType;
  const selectedSource = searchParams.get('source') as ActivitySource;
  const selectedFeed =
    (searchParams.get('feed') as 'global' | 'following') || 'global';
  const includeKnownBots = settings.includeKnownBots;

  // Parse activityTypes from URL params (lowercase) and convert to enum values
  const activityTypesParam = searchParams.getAll('activityTypes');
  const selectedActivityTypes =
    activityTypesParam.length > 0
      ? activityTypesParam
          .map((param) =>
            Object.values(ActivityType).find(
              (t) => t.toLowerCase() === param.toLowerCase(),
            ),
          )
          .filter((t): t is ActivityType => t !== undefined)
      : undefined;

  const activityTypesFilter = selectedActivityTypes;

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

  // Use the appropriate feed based on selection
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

  // Ensure animation is visible even for fast refetches
  const [showRefetchLoader, setShowRefetchLoader] = useState(false);
  const MIN_DISPLAY_TIME = 400; // milliseconds

  useEffect(() => {
    if (isRefetching) {
      setShowRefetchLoader(true);
    } else if (showRefetchLoader) {
      // Keep showing the loader for minimum time to ensure animation completes
      const timer = setTimeout(() => {
        setShowRefetchLoader(false);
      }, MIN_DISPLAY_TIME);
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
          <Stack gap={'xl'} mx={'auto'} maw={600} w={'100%'}>
            <Stack gap={60}>
              {allActivities.map((item) => (
                <FeedItem
                  key={item.id}
                  item={item}
                  analyticsContext={{
                    saveSource: CardSaveSource.FEED,
                    activeFilters: {
                      urlType: selectedUrlType,
                    },
                    pagePath: pathname,
                  }}
                />
              ))}
            </Stack>
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
