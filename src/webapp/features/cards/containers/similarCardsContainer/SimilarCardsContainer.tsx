'use client';

import useSimilarCards from '@/features/semble/lib/queries/useSimilarCards';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Grid, Group, Stack } from '@mantine/core';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import SembleEmptyTab from '@/features/semble/components/sembleEmptyTab/SembleEmptyTab';
import { BiLink } from 'react-icons/bi';
import { CardFilters } from '@/features/cards/components/cardFilters/CardFilters';
import { useSearchParams, usePathname } from 'next/navigation';
import { UrlType } from '@semble/types';
import { CardSaveSource } from '@/features/analytics/types';

interface Props {
  url: string;
}

export default function SimilarCardsContainer(props: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedUrlType = searchParams.get('type') as UrlType;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useSimilarCards({ url: props.url, urlType: selectedUrlType });

  const allSimilarUrls = data?.pages.flatMap((page) => page.urls ?? []) ?? [];

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
            message={`No similar ${selectedUrlType ? `${selectedUrlType} ` : ''}cards found`}
            icon={BiLink}
          />
        ) : (
          <Grid gap="sm" mx={'auto'} maw={600} w={'100%'}>
            {allSimilarUrls.map((urlView) => (
              <Grid.Col
                key={urlView.url}
                span={12}
                style={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: 'auto 300px',
                }}
              >
                <SimilarUrlCard
                  urlView={urlView}
                  analyticsContext={{
                    saveSource: CardSaveSource.SIMILAR_CARDS,
                    activeFilters: {
                      urlType: selectedUrlType,
                    },
                    pagePath: pathname,
                  }}
                />
              </Grid.Col>
            ))}
          </Grid>
        )}
      </InfiniteScroll>
    </Stack>
  );
}
