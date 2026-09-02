'use client';

import ErrorState from '@/components/contentDisplay/errorState/ErrorState';
import useSearchBlueskyPosts from '../../lib/queries/useSearchBlueskyPosts';
import { BlueskySearchSortOptions } from '../../lib/types';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { MdOutlineAlternateEmail } from 'react-icons/md';
import { Grid, Group, Select } from '@mantine/core';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import BlueskyMentionPost from '@/features/platforms/bluesky/components/blueskyMentionPost/BlueskyMentionPost';

interface Props {
  url: string;
  sortBy: BlueskySearchSortOptions;
}

export default function BlueskyMentionsContainer(props: Props) {
  const {
    data,
    error,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSearchBlueskyPosts({ query: props.url, sortBy: props.sortBy });

  const allPosts = data?.pages.flatMap((page) => page.posts ?? []) ?? [];

  if (error) {
    return <ErrorState message="Could not load mentions" />;
  }

  if (allPosts.length === 0) {
    return (
      <EmptyState message="No mentions found" icon={MdOutlineAlternateEmail} />
    );
  }

  return (
    <InfiniteScroll
      dataLength={allPosts.length}
      hasMore={!!hasNextPage}
      isInitialLoading={isPending}
      isLoading={isFetchingNextPage}
      loadMore={fetchNextPage}
    >
      <Grid gap="sm" mx={'auto'} maw={600} w={'100%'}>
        {allPosts.map((post) => (
          <Grid.Col key={post.uri} span={12}>
            <BlueskyMentionPost post={post} />
          </Grid.Col>
        ))}
      </Grid>
    </InfiniteScroll>
  );
}
