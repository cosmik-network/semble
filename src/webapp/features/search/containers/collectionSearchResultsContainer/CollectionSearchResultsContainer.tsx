'use client';

import SearchEmptyResults from '../../components/searchEmptyResults/SearchEmptyResults';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Grid, Stack } from '@mantine/core';
import SearchResultsContainerError from '../searchResultsContainer/Error.SearchResultsContainer';
import useSearchCollections from '@/features/collections/lib/queries/useSearchCollections';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import SearchQueryAlert from '../../components/searchQueryAlert/SearchQueryAlert';

interface Props {
  query: string;
}

export default function CollectionSearchResultsContainer(props: Props) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useSearchCollections({ searchText: props.query });

  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  return (
    <Stack gap="md">
      <SearchQueryAlert query={props.query} />

      {error ? (
        <SearchResultsContainerError />
      ) : !isPending && allCollections.length === 0 ? (
        <SearchEmptyResults query={props.query} type="collections" />
      ) : (
        <InfiniteScroll
          dataLength={allCollections.length}
          hasMore={!!hasNextPage}
          isInitialLoading={isPending}
          isLoading={isFetchingNextPage}
          loadMore={fetchNextPage}
        >
          <Grid gutter="xs">
            {allCollections.map((collection) => (
              <Grid.Col key={collection.id} span={12}>
                <CollectionCard collection={collection} showAuthor />
              </Grid.Col>
            ))}
          </Grid>
        </InfiniteScroll>
      )}
    </Stack>
  );
}
