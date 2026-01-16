'use client';

import { AppShellAside, Grid, Group, Stack, Text } from '@mantine/core';
import useSembleSimilarCards from '../../lib/queries/useSembleSimilarCards';
import SembleSimilarCardsContainerError from '../sembleSimilarCardsContainer/Error.SembleSimilarCardsContainer';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import SimilarUrlCard from '../../components/similarUrlCard/SimilarUrlCard';
import { useSearchParams } from 'next/navigation';
import { UrlType } from '@semble/types';
import CardFilters from '@/features/cards/components/cardFilters/CardFilters';
import CardTypeFilter from '@/features/cards/components/cardFilters/CardTypeFilter';

interface Props {
  url: string;
}

export default function SembleAside(props: Props) {
  const searchParams = useSearchParams();
  const selectedUrlType = searchParams.get('type') as UrlType;

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useSembleSimilarCards({ url: props.url, urlType: selectedUrlType });

  const allSimilarUrls = data?.pages.flatMap((page) => page.urls ?? []) ?? [];

  if (error) {
    return (
      <AppShellAside p={'sm'} style={{ overflow: 'scroll' }}>
        <Stack gap={'xs'}>
          <Text fz={'xl'} fw={600}>
            Similar cards
          </Text>
          <SembleSimilarCardsContainerError />
        </Stack>
      </AppShellAside>
    );
  }

  if (allSimilarUrls.length === 0) {
    return (
      <AppShellAside p={'sm'} style={{ overflow: 'scroll' }}>
        <Stack gap={'xs'}>
          <Group gap={'xs'} justify="space-between">
            <Text fz={'xl'} fw={600}>
              Similar cards
            </Text>
            <CardFilters>
              <CardTypeFilter />
            </CardFilters>
          </Group>
          <Text c={'gray'} fw={600}>
            No similar {selectedUrlType} cards found
          </Text>
        </Stack>
      </AppShellAside>
    );
  }

  return (
    <AppShellAside p={'sm'} style={{ overflow: 'scroll' }}>
      <Stack gap={'xs'}>
        <Group gap={'xs'} justify="space-between">
          <Text fz={'xl'} fw={600}>
            Similar cards
          </Text>
          <CardFilters>
            <CardTypeFilter />
          </CardFilters>
        </Group>
        <InfiniteScroll
          dataLength={allSimilarUrls.length}
          hasMore={!!hasNextPage}
          isInitialLoading={isPending}
          isLoading={isFetchingNextPage}
          loadMore={fetchNextPage}
        >
          <Grid gutter="xs" mx={'auto'} maw={'100%'}>
            {allSimilarUrls.map((urlView) => (
              <Grid.Col key={urlView.url} span={12}>
                <SimilarUrlCard urlView={urlView} />
              </Grid.Col>
            ))}
          </Grid>
        </InfiniteScroll>
      </Stack>
    </AppShellAside>
  );
}
