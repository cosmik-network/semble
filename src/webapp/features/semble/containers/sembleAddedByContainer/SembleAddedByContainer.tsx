'use client';

import useSembleLibraries from '../../lib/queries/useSembleLibraries';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Grid } from '@mantine/core';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { LuLibrary } from 'react-icons/lu';
import ProfileCard from '@/features/profile/components/profileCard/ProfileCard';

interface Props {
  url: string;
}

export default function SembleAddedByContainer(props: Props) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useSembleLibraries({ url: props.url });

  const allLibraries =
    data?.pages.flatMap((page) => page.libraries ?? []) ?? [];

  if (allLibraries.length === 0) {
    return (
      <EmptyState
        message="No one has added this to their library yet"
        icon={LuLibrary}
      />
    );
  }

  return (
    <InfiniteScroll
      dataLength={allLibraries.length}
      hasMore={!!hasNextPage}
      isInitialLoading={isPending}
      isLoading={isFetchingNextPage}
      loadMore={fetchNextPage}
    >
      <Grid gap="xs">
        {allLibraries.map((item, i) => (
          <Grid.Col
            key={item.user.name}
            span={{
              base: 12,
            }}
          >
            <ProfileCard profile={item.user} addedAt={item.card.createdAt} />
          </Grid.Col>
        ))}
      </Grid>
    </InfiniteScroll>
  );
}
