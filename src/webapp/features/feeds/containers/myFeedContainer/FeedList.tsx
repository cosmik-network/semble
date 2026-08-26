'use client';

import { Box, Collapse, Container, Loader, Stack, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { GetGlobalFeedResponse, UrlType } from '@semble/types';
import FeedItem from '@/features/feeds/components/feedItem/FeedItem';
import FeedEmptyState from '@/features/feeds/components/feedEmptyState/FeedEmptyState';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import RefetchButton from '@/components/navigation/refetchButton/RefetchButton';
import { CardSaveSource } from '@/features/analytics/types';
import { FeedView } from '@/features/feeds/lib/feedOptions';
import MyFeedContainerSkeleton from './Skeleton.MyFeedContainer';
import MyFeedContainerError from './Error.MyFeedContainer';

const MIN_REFETCH_LOADER_MS = 400;

/**
 * The slice of a react-query result this list reads, declared structurally so
 * the suspense global feed and the two plain infinite queries both satisfy it
 * without their result types having to line up.
 */
export interface FeedQuery {
  data?: { pages: GetGlobalFeedResponse[] };
  error: unknown;
  isPending: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isRefetching: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
}

interface Props {
  query: FeedQuery;
  view: FeedView;
  /** Reported with each save, so a save can be attributed to a filter. */
  urlType?: UrlType;
  hasFilters: boolean;
  onClearFilters: () => void;
}

/** Renders whichever feed it is handed; the caller decides which one that is. */
export default function FeedList(props: Props) {
  const pathname = usePathname();
  const {
    data,
    error,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
    refetch,
  } = props.query;

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
        <Box py="xl">
          <FeedEmptyState
            view={props.view}
            hasFilters={props.hasFilters}
            onClearFilters={props.onClearFilters}
          />
        </Box>
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
                    activeFilters: { urlType: props.urlType },
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
