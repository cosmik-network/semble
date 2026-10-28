'use client';

import { Box, Button, Center, Container, Stack } from '@mantine/core';
import { MouseEvent, useRef } from 'react';
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
import useListDepth from '@/features/analytics/useListDepth';
import {
  describeItemClick,
  findClickedItem,
} from '@/features/analytics/pageVisit';
import {
  HomeFeedState,
  trackHomeFeedAction,
  trackHomeFeedItemClicked,
  trackHomeFeedListDepth,
} from '@/features/feeds/lib/analytics';

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
  feedState: HomeFeedState;
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

  const listRef = useRef<HTMLDivElement>(null);
  useListDepth({
    containerRef: listRef,
    itemsLoaded: allActivities.length,
    pagesLoaded: data?.pages.length ?? 0,
    hasMore: !!hasNextPage,
    urlType: props.urlType,
    onReport: (depth) => trackHomeFeedListDepth(props.feedState, depth),
  });

  const handleItemClick = (e: MouseEvent<HTMLDivElement>) => {
    const item = findClickedItem(e.currentTarget, e.target as Element);
    if (!item) return;

    const click = describeItemClick(item);
    if (!click) return;

    const activityType = item.closest<HTMLElement>('[data-analytics-position]')
      ?.dataset.analyticsActivityType;
    trackHomeFeedItemClicked(props.feedState, {
      ...click,
      activity_type: activityType,
    });
  };

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
    <Container p="xs" size="xl" onClickCapture={handleItemClick}>
      <RefetchLoader isRefetching={isRefetching} subject="activities" />
      {allActivities.length === 0 && hasNextPage ? (
        // Every page so far was filtered out server-side. A button rather than
        // InfiniteScroll, whose sentinel would stay visible and auto-fetch
        // through the whole feed.
        <Center py="xl">
          <Button
            variant="light"
            color="gray"
            loading={isFetchingNextPage}
            onClick={() => {
              trackHomeFeedAction(props.feedState, 'load_more');
              fetchNextPage();
            }}
          >
            Load more
          </Button>
        </Center>
      ) : allActivities.length === 0 ? (
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
          <Stack ref={listRef} gap={60} mx={'auto'} maw={600} w={'100%'}>
            {allActivities.map((item, index) => (
              <Box
                key={item.id}
                data-analytics-position={index + 1}
                data-analytics-activity-type={item.activityType}
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
                    listPosition: index + 1,
                  }}
                />
              </Box>
            ))}
          </Stack>
        </InfiniteScroll>
      )}

      <RefetchButton
        onRefetch={() => {
          trackHomeFeedAction(props.feedState, 'refresh');
          refetch();
        }}
      />
    </Container>
  );
}
