'use client';

import useSembleSimilarCards from '../../lib/queries/useSembleSimilarCards';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Grid, Group, Stack } from '@mantine/core';
import SembleSimilarCardsContainerError from './Error.SembleSimilarCardsContainer';
import SimilarUrlCard from '../../components/similarUrlCard/SimilarUrlCard';
import SembleEmptyTab from '../../components/sembleEmptyTab/SembleEmptyTab';
import { BiLink } from 'react-icons/bi';
import { CardFilters } from '@/features/cards/components/cardFilters/CardFilters';
import { useSearchParams } from 'next/navigation';
import { UrlType } from '@semble/types';

interface Props {
  url: string;
}

export default function SembleSimilarCardsContainer(props: Props) {
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
    return <SembleSimilarCardsContainerError />;
  }

  return (
    <Stack gap={'xs'} align="center">
      <Group justify="space-between" w={'100%'} maw={600}>
        <CardFilters.Root>
          <CardFilters.ViewToggle />
          <CardFilters.TypeFilter />
        </CardFilters.Root>
      </Group>
      <InfiniteScroll
        dataLength={allSimilarUrls.length}
        hasMore={!!hasNextPage}
        isInitialLoading={isPending}
        isLoading={isFetchingNextPage}
        loadMore={fetchNextPage}
      >
        {allSimilarUrls.length === 0 ? (
          <SembleEmptyTab
            message={`No similar  ${selectedUrlType} cards found`}
            icon={BiLink}
          />
        ) : (
          <Grid gutter="sm" mx={'auto'} maw={600} w={'100%'}>
            {allSimilarUrls.map((urlView) => (
              <Grid.Col key={urlView.url} span={12}>
                <SimilarUrlCard urlView={urlView} />
              </Grid.Col>
            ))}
          </Grid>
        )}
      </InfiniteScroll>
    </Stack>
  );
}
