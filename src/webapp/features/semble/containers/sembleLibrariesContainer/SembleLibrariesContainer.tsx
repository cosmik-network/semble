'use client';

import useSembleLibraries from '../../lib/queries/useSembleLibraries';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Grid } from '@mantine/core';
import SembleLibrariesContainerError from './Error.SembleLibrariesContainer';
import SembleEmptyTab from '../../components/sembleEmptyTab/SembleEmptyTab';
import { LuLibrary } from 'react-icons/lu';
import AddedByCard from '../../components/addedByCard/AddedByCard';

interface Props {
  url: string;
}

export default function SembleLibrariesContainer(props: Props) {
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

  if (error) {
    return <SembleLibrariesContainerError />;
  }

  if (allLibraries.length === 0) {
    return (
      <SembleEmptyTab
        message="No one has added this link to their library yet"
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
      <Grid gutter="xs">
        {allLibraries.map((item, i) => (
          <Grid.Col
            key={item.user.name}
            span={{
              base: 12,
            }}
          >
            <AddedByCard item={item} />
          </Grid.Col>
        ))}
      </Grid>
    </InfiniteScroll>
  );
}
