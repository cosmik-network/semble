'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ActionIcon, Grid, Group, Stack, Text, Tooltip } from '@mantine/core';
import { BiLink, BiRefresh } from 'react-icons/bi';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import SembleEmptyTab from '@/features/semble/components/sembleEmptyTab/SembleEmptyTab';
import useRecommendedCards from '@/features/cards/lib/queries/useRecommendedCards';
import { cardKeys } from '@/features/cards/lib/cardKeys';
import { CardSaveSource } from '@/features/analytics/types';

export default function RecommendedCardsContainer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const queries = searchParams.getAll('queries');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useRecommendedCards({ queries });

  const usedQueries = data?.pages[0]?.queries ?? [];

  // When the server derives the queries, pin them in the URL so pagination
  // and reloads keep reading from the same cached ranked set.
  useEffect(() => {
    if (queries.length === 0 && usedQueries.length > 0) {
      const params = new URLSearchParams();
      usedQueries.forEach((q) => params.append('queries', q));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.length, usedQueries.join('|')]);

  const handleRefresh = () => {
    // Drop cached recommendations and re-run with no queries so the server
    // derives a fresh set
    queryClient.removeQueries({ queryKey: cardKeys.recommended() });
    router.replace(pathname, { scroll: false });
  };

  const allUrls = data?.pages.flatMap((page) => page.urls ?? []) ?? [];

  return (
    <Stack gap={'xs'} align="center">
      <Group justify="space-between" w={'100%'} maw={600}>
        <Text c={'dimmed'}>
          Content recommended based on your recent activity.
        </Text>
        <Tooltip label="Get fresh recommendations">
          <ActionIcon
            variant="light"
            radius={'xl'}
            size={'lg'}
            onClick={handleRefresh}
            aria-label="Refresh recommendations"
          >
            <BiRefresh size={22} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <InfiniteScroll
        dataLength={allUrls.length}
        hasMore={!!hasNextPage}
        isInitialLoading={isPending}
        isLoading={isFetchingNextPage}
        loadMore={fetchNextPage}
      >
        {allUrls.length === 0 ? (
          <SembleEmptyTab message="No recommendations found" icon={BiLink} />
        ) : (
          <Grid gap="sm" mx={'auto'} maw={600} w={'100%'}>
            {allUrls.map((urlView) => (
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
                    saveSource: CardSaveSource.RECOMMENDED,
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
