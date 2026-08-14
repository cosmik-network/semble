'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import {
  ActionIcon,
  Button,
  Collapse,
  Grid,
  Group,
  NumberInput,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { BiLink, BiRefresh, BiSlider } from 'react-icons/bi';
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
import {
  DEFAULT_RANKING_WEIGHTS,
  RANKING_WEIGHT_FIELDS,
  RankingWeights,
} from '@/features/cards/lib/types/rankingWeights';

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

  // `draftWeights` tracks the inputs; `weights` is what's actually fetched, so
  // typing a multi-digit value doesn't fire a request per keystroke.
  const [showWeights, setShowWeights] = useState(false);
  const [draftWeights, setDraftWeights] = useState<RankingWeights>(
    DEFAULT_RANKING_WEIGHTS,
  );
  const [weights, setWeights] = useState<RankingWeights>(
    DEFAULT_RANKING_WEIGHTS,
  );

  const weightsDirty = RANKING_WEIGHT_FIELDS.some(
    ({ key }) => draftWeights[key] !== weights[key],
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useRecommendedCards({ queries, enabled: hydrated, weights });

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
        <Group gap={'xs'}>
          <Tooltip label="Adjust ranking weights">
            <ActionIcon
              variant={showWeights ? 'filled' : 'light'}
              radius={'xl'}
              size={'lg'}
              onClick={() => setShowWeights((v) => !v)}
              aria-label="Adjust ranking weights"
              aria-expanded={showWeights}
            >
              <BiSlider size={20} />
            </ActionIcon>
          </Tooltip>
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
      </Group>

      <Collapse expanded={showWeights} w={'100%'} maw={600}>
        <Stack gap={'xs'} p={'sm'}>
          <Text size="sm" c={'dimmed'}>
            Weights applied to each URL&apos;s network activity when ranking.
          </Text>
          <Group gap={'xs'} align="flex-end" wrap="wrap">
            {RANKING_WEIGHT_FIELDS.map(({ key, label, step, min, max }) => (
              <NumberInput
                key={key}
                label={label}
                value={draftWeights[key]}
                onChange={(value) =>
                  setDraftWeights((prev) => ({
                    ...prev,
                    // Clearing the input yields '' — keep the last number so
                    // the request never sends NaN.
                    [key]: typeof value === 'number' ? value : prev[key],
                  }))
                }
                step={step}
                min={min}
                max={max}
                w={110}
                size="xs"
              />
            ))}
          </Group>
          <Group gap={'xs'}>
            <Button
              size="xs"
              onClick={() => setWeights(draftWeights)}
              disabled={!weightsDirty}
            >
              Apply
            </Button>
            <Button
              size="xs"
              variant="subtle"
              onClick={() => {
                setDraftWeights(DEFAULT_RANKING_WEIGHTS);
                setWeights(DEFAULT_RANKING_WEIGHTS);
              }}
            >
              Reset
            </Button>
          </Group>
        </Stack>
      </Collapse>
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
