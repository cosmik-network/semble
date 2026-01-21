'use client';

import { useState } from 'react';
import SearchEmptyResults from '../../components/searchEmptyResults/SearchEmptyResults';
import useSemanticSearch from '../../lib/queries/useSemanticSearch';
import { UrlType } from '@semble/types';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Grid, Group } from '@mantine/core';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import SearchResultsContainerError from '../searchResultsContainer/Error.SearchResultsContainer';
import SearchQueryAlert from '../../components/searchQueryAlert/SearchQueryAlert';
import UsernameSearch from '../../components/usernameSearch/UsernameSearch';

interface Props {
  query: string;
  handle?: string;
}

export default function CardSearchResultsContainer(props: Props) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useSemanticSearch({ query: props.query, userId: props.handle });

  const allUrls = data?.pages.flatMap((page) => page.urls ?? []) ?? [];

  if (error) {
    return <SearchResultsContainerError />;
  }

  if (!isPending && allUrls.length === 0) {
    return <SearchEmptyResults query={props.query} type="cards" />;
  }

  return (
    <InfiniteScroll
      dataLength={allUrls.length}
      hasMore={!!hasNextPage}
      isInitialLoading={isPending}
      isLoading={isFetchingNextPage}
      loadMore={fetchNextPage}
    >
      <Group gap={'xs'} justify="space-between" wrap="nowrap">
        <SearchQueryAlert query={props.query} handle={props.handle} />

        <UsernameSearch />
      </Group>
      <Grid gutter="xs">
        {allUrls.map((urlView) => (
          <Grid.Col key={urlView.url} span={12}>
            <SimilarUrlCard urlView={urlView} />
          </Grid.Col>
        ))}
      </Grid>
    </InfiniteScroll>
  );
}
