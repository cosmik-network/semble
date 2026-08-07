'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { ActionIcon, Grid, Group, Stack, Text, Tooltip } from '@mantine/core';
import { BiLink, BiRefresh } from 'react-icons/bi';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import SembleEmptyTab from '@/features/semble/components/sembleEmptyTab/SembleEmptyTab';
import useRecommendedCards from '@/features/cards/lib/queries/useRecommendedCards';
import { cardKeys } from '@/features/cards/lib/cardKeys';
import { CardSaveSource } from '@/features/analytics/types';
import {
  clearStoredQueries,
  readStoredQueries,
  writeStoredQueries,
} from '@/features/cards/lib/utils/recommendedQueriesStorage';

export default function RecommendedCardsContainer() {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // Read once on mount rather than during render so server and client markup
  // agree; stale entries (>2min) come back empty and the server re-derives.
  const [queries, setQueries] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setQueries(readStoredQueries());
    setHydrated(true);
  }, []);

  // Clear on unmount so navigating away drops the pinned queries
  useEffect(() => clearStoredQueries, []);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useRecommendedCards({ queries, enabled: hydrated });

  const usedQueries = data?.pages[0]?.queries ?? [];

  // When the server derives the queries, pin them so pagination and reloads
  // keep reading from the same cached ranked set.
  useEffect(() => {
    if (queries.length === 0 && usedQueries.length > 0) {
      writeStoredQueries(usedQueries);
      setQueries(usedQueries);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries.length, usedQueries.join('|')]);

  const handleRefresh = () => {
    // Drop cached recommendations and re-run with no queries so the server
    // derives a fresh set
    queryClient.removeQueries({ queryKey: cardKeys.recommended() });
    clearStoredQueries();
    setQueries([]);
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
                  liveStats
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
