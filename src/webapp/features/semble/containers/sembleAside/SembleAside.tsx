'use client';

import { AppShellAside, Grid, Stack, Text } from '@mantine/core';
import useSembleSimilarCards from '../../lib/queries/useSembleSimilarCards';
import SembleSimilarCardsContainerError from '../sembleSimilarCardsContainer/Error.SembleSimilarCardsContainer';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import SimilarUrlCard from '../../components/similarUrlCard/SimilarUrlCard';

interface Props {
  url: string;
}

export default function SembleAside(props: Props) {
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
    return (
      <AppShellAside p={'sm'} style={{ overflow: 'scroll' }}>
        <Stack gap={'xs'}>
          <Text fz={'xl'} fw={600}>
            Added recently by
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
          <Text fz={'xl'} fw={600}>
            Added recently by
          </Text>
          <Text c={'gray'} fw={600}>
            No similar cards found
          </Text>          
        </Stack>
      </AppShellAside>
    );
  }

  return (
    <AppShellAside p={'sm'} style={{ overflow: 'scroll' }}>
      <Stack gap={'xs'}>
        <Text fz={'xl'} fw={600}>
          Added recently by
        </Text>
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
