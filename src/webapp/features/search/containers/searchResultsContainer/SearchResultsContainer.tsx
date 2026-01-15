'use client';

import useSemanticSearch from '../../lib/queries/useSemanticSearch';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Grid } from '@mantine/core';
import SearchResultsContainerError from './Error.SearchResultsContainer';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import SearchEmptyResults from '../../components/searchEmptyResults/SearchEmptyResults';

interface Props {
  query: string;
  userId?: string;
}

export default function SearchResultsContainer(props: Props) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useSemanticSearch({ query: props.query, userId: props.userId });

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
      <Grid gutter="xs" mx={'auto'} maw={600}>
        {allUrls.map((urlView) => (
          <Grid.Col key={urlView.url} span={12}>
            <SimilarUrlCard urlView={urlView} />
          </Grid.Col>
        ))}
      </Grid>
    </InfiniteScroll>
  );
}
