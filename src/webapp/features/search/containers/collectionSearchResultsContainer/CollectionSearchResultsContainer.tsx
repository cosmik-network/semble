'use client';

import SearchEmptyResults from '../../components/searchEmptyResults/SearchEmptyResults';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Grid, Group, Stack } from '@mantine/core';
import SearchResultsContainerError from '../searchResultsContainer/Error.SearchResultsContainer';
import useSearchCollections from '@/features/collections/lib/queries/useSearchCollections';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import SearchQueryAlert from '../../components/searchQueryAlert/SearchQueryAlert';
import { SearchFilters } from '../../components/searchFilters/SearchFilters';

interface Props {
  query: string;
  handle?: string;
}

export default function CollectionSearchResultsContainer(props: Props) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useSearchCollections({
    searchText: props.query,
    handleOrDid: props.handle,
  });

  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  return (
    <Stack gap="md">
      <Group gap={'xs'} justify="space-between" wrap="nowrap">
        <SearchQueryAlert query={props.query} handle={props.handle} />
        <SearchFilters.Root>
          <SearchFilters.ProfileFilter />
          <SearchFilters.Actions />
        </SearchFilters.Root>
      </Group>

      {error ? (
        <SearchResultsContainerError />
      ) : !isPending && props.query && allCollections.length === 0 ? (
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
