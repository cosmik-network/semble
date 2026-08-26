'use client';

import { Stack, Text } from '@mantine/core';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { FaRegNoteSticky } from 'react-icons/fa6';
import useRecommendedCards from '@/features/cards/lib/queries/useRecommendedCards';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import { CardSaveSource } from '@/features/analytics/types';
import ExploreSectionHeader from '../exploreSectionHeader/ExploreSectionHeader';
import ExploreScroller from '../exploreScroller/ExploreScroller';
import { EXPLORE_ROUTES } from '../../lib/exploreRoutes';
import { EXPLORE_CARDS_QUERY } from '../../lib/exploreCardsQuery';
import RefreshButton from '../refreshButton/RefreshButton';
import ExploreCardsSkeleton from './Skeleton.ExploreCards';
import ExploreCardsError from './Error.ExploreCards';

// How far down the ranking a refresh will walk before starting over. The
// recommender ranks up to 100 URLs, but the tail is weak.
const MAX_PAGES = 3;

export default function ExploreCards() {
  const pathname = usePathname();

  // Which already-ranked page the shelf is showing. Refreshing walks these
  // rather than re-requesting: the server caches the ranked set for an hour
  // keyed on (user, weights, queries), so a repeat request returns identically.
  const [pageIndex, setPageIndex] = useState(0);

  const { data, isPending, isError, isFetching, fetchNextPage, hasNextPage } =
    useRecommendedCards({ ...EXPLORE_CARDS_QUERY, keepPreviousData: true });

  const pages = data?.pages;
  const pageCount = pages?.length ?? 0;
  // A page requested but not yet delivered leaves the index past the end;
  // keep showing the last one we have (dimmed) until it lands.
  const shownIndex = Math.min(pageIndex, Math.max(0, pageCount - 1));
  const urls = pages?.[shownIndex]?.urls ?? [];

  const isRefreshing = !isPending && isFetching;
  // A page that fails mid-walk leaves the earlier ones on screen, so only take
  // over the shelf when there's nothing left to show.
  const hasFailed = isError && urls.length === 0;

  const onRefresh = () => {
    const next = pageIndex + 1;
    if (next < pageCount) {
      setPageIndex(next);
      return;
    }
    if (hasNextPage && pageCount < MAX_PAGES) {
      setPageIndex(next);
      fetchNextPage();
      return;
    }
    // Out of ranking worth showing — start the walk over.
    setPageIndex(0);
  };

  // Replay the deal animation on arrival, not on tap — tapping would animate
  // the outgoing cards. shownIndex only moves once the page is renderable.
  const [prevShownIndex, setPrevShownIndex] = useState(shownIndex);
  const [dealKey, setDealKey] = useState(0);
  if (shownIndex !== prevShownIndex) {
    setPrevShownIndex(shownIndex);
    setDealKey((k) => k + 1);
  }

  if (isPending) return <ExploreCardsSkeleton />;

  return (
    <Stack>
      <ExploreSectionHeader
        icon={<FaRegNoteSticky size={22} />}
        title="Cards"
        subtitle="Recommended for you"
        viewAllHref={EXPLORE_ROUTES.cards}
        actions={
          <RefreshButton
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            subject="cards"
          />
        }
      />

      {hasFailed ? (
        <ExploreCardsError />
      ) : urls.length > 0 ? (
        <ExploreScroller dealKey={dealKey} dimmed={isRefreshing}>
          {urls.map((urlView) => (
            <SimilarUrlCard
              key={urlView.url}
              urlView={urlView}
              analyticsContext={{
                saveSource: CardSaveSource.RECOMMENDED,
                pagePath: pathname,
              }}
            />
          ))}
        </ExploreScroller>
      ) : (
        <Stack align="center" gap="xs">
          <Text fz="h3" fw={600} c="gray">
            No recommendations yet
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
