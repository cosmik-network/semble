'use client';

import useSembleSimilarCards from '../../lib/queries/useSembleSimilarCards';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Grid, Group, Stack } from '@mantine/core';
import SembleSimilarCardsContainerError from './Error.SembleSimilarCardsContainer';
import SimilarUrlCard from '../../components/similarUrlCard/SimilarUrlCard';
import SembleEmptyTab from '../../components/sembleEmptyTab/SembleEmptyTab';
import { BiLink } from 'react-icons/bi';
import CardTypeFilter from '@/features/cards/components/cardFilters/CardTypeFilter';
import CardViewToggle from '@/features/cards/components/cardFilters/CardViewToggle';
import CardFilters from '@/features/cards/components/cardFilters/CardFilters';

interface Props {
  url: string;
}

export default function SembleSimilarCardsContainer(props: Props) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useSembleSimilarCards({ url: props.url });

  const allSimilarUrls = data?.pages.flatMap((page) => page.urls ?? []) ?? [];

  if (error) {
    return <SembleSimilarCardsContainerError />;
  }

  if (allSimilarUrls.length === 0) {
    return <SembleEmptyTab message="No similar cards found" icon={BiLink} />;
  }

  return (
    <Stack gap={'xs'} align="center">
      <Group justify="space-between" w={'100%'} maw={600}>
        <CardFilters>
          <CardTypeFilter />
          <CardViewToggle />
        </CardFilters>
      </Group>
      <InfiniteScroll
        dataLength={allSimilarUrls.length}
        hasMore={!!hasNextPage}
        isInitialLoading={isPending}
        isLoading={isFetchingNextPage}
        loadMore={fetchNextPage}
      >
        <Grid gutter="sm" mx={'auto'} maw={600}>
          {allSimilarUrls.map((urlView) => (
            <Grid.Col key={urlView.url} span={12}>
              <SimilarUrlCard urlView={urlView} />
            </Grid.Col>
          ))}
        </Grid>
      </InfiniteScroll>
    </Stack>
  );
}
