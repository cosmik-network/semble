import SembleMentionsContainerError from '@/features/semble/containers/sembleMentionsContainer/Error.SembleMentionsContainer';
import useSearchBlueskyPosts from '../../lib/queries/useSearchBlueskyPosts';
import { BlueskySearchSortOptions } from '../../lib/types';
import SembleEmptyTab from '@/features/semble/components/sembleEmptyTab/SembleEmptyTab';
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
    return <SembleMentionsContainerError />;
  }

  if (allPosts.length === 0) {
    return (
      <SembleEmptyTab
        message="No mentions found"
        icon={MdOutlineAlternateEmail}
      />
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
      <Grid gutter="sm" mx={'auto'} maw={600} w={'100%'}>
        {allPosts.map((post) => (
          <Grid.Col key={post.uri} span={12}>
            <BlueskyMentionPost post={post} />
          </Grid.Col>
        ))}
      </Grid>
    </InfiniteScroll>
  );
}
