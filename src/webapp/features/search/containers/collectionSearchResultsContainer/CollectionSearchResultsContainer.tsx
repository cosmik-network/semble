'use client';

import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { BiSearch } from 'react-icons/bi';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Center, Grid, Group, Stack } from '@mantine/core';
import SearchResultsContainerError from '../searchResultsContainer/Error.SearchResultsContainer';
import useSearchCollections from '@/features/collections/lib/queries/useSearchCollections';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import SearchQueryAlert from '../../components/searchQueryAlert/SearchQueryAlert';
import { SearchFilters } from '../../components/searchFilters/SearchFilters';
import { CollectionAccessType } from '@semble/types';

interface Props {
  query: string;
  handle?: string;
  accessType?: CollectionAccessType;
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
    identifier: props.handle,
    accessType: props.accessType,
  });

  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  return (
    <Stack gap="md">
      <Group gap={'xs'} justify="space-between" wrap="nowrap">
        <SearchQueryAlert
          query={props.query}
          handle={props.handle}
          count={allCollections.length}
        />
        <SearchFilters.Root>
          <SearchFilters.ProfileFilter />
          <SearchFilters.AccessTypeFilter />
          <SearchFilters.Actions />
        </SearchFilters.Root>
      </Group>

      {error ? (
        <SearchResultsContainerError />
      ) : !isPending && props.query && allCollections.length === 0 ? (
        <Center py="xl">
          <EmptyState
            icon={BiSearch}
            message="No collections found"
            description="Try a different search term"
          />
        </Center>
      ) : (
        <InfiniteScroll
          dataLength={allCollections.length}
          hasMore={!!hasNextPage}
          isInitialLoading={isPending}
          isLoading={isFetchingNextPage}
          loadMore={fetchNextPage}
        >
          <Grid gap="xs">
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
