'use client';

import useSembleLibraries from '../../lib/queries/useSembleLibraries';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Center, Grid, Loader } from '@mantine/core';
import SembleLibrariesContainerError from './Error.SembleLibrariesContainer';
// import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import SembleEmptyTab from '../../components/sembleEmptyTab/SembleEmptyTab';
import { LuLibrary } from 'react-icons/lu';

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
      manualLoadButton={false}
      loader={
        <Center>
          <Loader />
        </Center>
      }
    >
      <Grid gutter="md">
        {allLibraries.map((u) => (
          <Grid.Col
            key={u.userId}
            span={{
              base: 12,
              sm: 6,
              lg: 3,
            }}
          >
            <>{u.userId}</>
            {/*<CollectionCard key={col.id} collection={col} />*/}
          </Grid.Col>
        ))}
      </Grid>
    </InfiniteScroll>
  );
}
