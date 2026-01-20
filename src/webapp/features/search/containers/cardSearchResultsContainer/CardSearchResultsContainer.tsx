import { useState } from 'react';
import SearchEmptyResults from '../../components/searchEmptyResults/SearchEmptyResults';
import useSemanticSearch from '../../lib/queries/useSemanticSearch';
import { UrlType } from '@semble/types';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Grid } from '@mantine/core';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import SearchResultsContainerError from '../searchResultsContainer/Error.SearchResultsContainer';

interface Props {
  query: string;
}

export default function CardSearchResultsContainer(props: Props) {
  const [user, setUser] = useState();
  const [type, setType] = useState<UrlType>();

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useSemanticSearch({ query: props.query, userId: user });

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
