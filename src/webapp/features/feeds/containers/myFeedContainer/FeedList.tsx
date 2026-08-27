'use client';

import { Box, Container, Stack } from '@mantine/core';
import { usePathname } from 'next/navigation';
import { GetGlobalFeedResponse, UrlType } from '@semble/types';
import FeedItem from '@/features/feeds/components/feedItem/FeedItem';
import FeedEmptyState from '@/features/feeds/components/feedEmptyState/FeedEmptyState';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import RefetchLoader from '@/components/contentDisplay/refetchLoader/RefetchLoader';
import RefetchButton from '@/components/navigation/refetchButton/RefetchButton';
import { CardSaveSource } from '@/features/analytics/types';
import { FeedView } from '@/features/feeds/lib/feedOptions';
import MyFeedContainerSkeleton from './Skeleton.MyFeedContainer';
import ErrorState from '@/components/contentDisplay/errorState/ErrorState';

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

  const allActivities =
    data?.pages.flatMap((page) => page.activities ?? []) ?? [];

  if (isPending) {
    return <MyFeedContainerSkeleton />;
  }

  if (error) {
    return (
      <Container p="xs" size="xl">
        <ErrorState message="Could not load feed" />
      </Container>
    );
  }

  return (
    <Container p="xs" size="xl">
      <RefetchLoader isRefetching={isRefetching} subject="activities" />
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

      <RefetchButton onRefetch={() => refetch()} />
    </Container>
  );
}
