'use client';

import { useState } from 'react';
import SearchEmptyResults from '../../components/searchEmptyResults/SearchEmptyResults';
import useSemanticSearch from '../../lib/queries/useSemanticSearch';
import { UrlType } from '@semble/types';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Grid, Group, Stack } from '@mantine/core'; // Added Stack for better spacing
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import SearchResultsContainerError from '../searchResultsContainer/Error.SearchResultsContainer';
import SearchQueryAlert from '../../components/searchQueryAlert/SearchQueryAlert';
import { SearchFilters } from '../../components/searchFilters/SearchFilters';

interface Props {
  query: string;
  handle?: string;
  urlType?: UrlType;
}

export default function CardSearchResultsContainer(props: Props) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useSemanticSearch({
    query: props.query,
    userId: props.handle,
    urlType: props.urlType,
  });

  const allUrls = data?.pages.flatMap((page) => page.urls ?? []) ?? [];

  return (
    <Stack gap="md">
      <Group gap={'xs'} justify="space-between" wrap="nowrap">
        <SearchQueryAlert query={props.query} handle={props.handle} />
        <SearchFilters.Root>
          <SearchFilters.ProfileFilter />
          <SearchFilters.UrlTypeFilter />
          <SearchFilters.Actions />
        </SearchFilters.Root>
      </Group>

      {error ? (
        <SearchResultsContainerError />
      ) : !isPending && allUrls.length === 0 ? (
        <SearchEmptyResults query={props.query} type="cards" />
      ) : (
        <InfiniteScroll
          dataLength={allUrls.length}
          hasMore={!!hasNextPage}
          isInitialLoading={isPending}
          isLoading={isFetchingNextPage}
          loadMore={fetchNextPage}
        >
          <Grid gutter="xs">
            {allUrls.map((urlView) => (
              <Grid.Col key={urlView.url} span={12}>
                <SimilarUrlCard urlView={urlView} />
              </Grid.Col>
            ))}
          </Grid>
        </InfiniteScroll>
      )}
    </Stack>
  );
}
