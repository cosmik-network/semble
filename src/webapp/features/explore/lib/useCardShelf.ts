'use client';

import { useState } from 'react';
import useRecommendedCards from '@/features/cards/lib/queries/useRecommendedCards';
import { EXPLORE_CARDS_QUERY } from './exploreCardsQuery';

// How far down the ranking a refresh will walk before starting over. The
// recommender ranks up to 100 URLs, but the tail is weak.
const MAX_PAGES = 3;

/**
 * The cards shelf, and what its refresh button does.
 *
 * Refreshing walks the already-ranked pages rather than re-requesting them:
 * the server caches the ranked set for an hour keyed on (user, weights,
 * queries), so asking again returns the same cards. Past the last page in
 * hand we fetch one more; past `MAX_PAGES` we start the walk over.
 */
export function useCardShelf() {
  const [page, setPage] = useState(0);
  const [shuffled, setShuffled] = useState(false);
  const { data, isPending, isError, isFetching, fetchNextPage, hasNextPage } =
    useRecommendedCards({ ...EXPLORE_CARDS_QUERY, keepPreviousData: true });

  const pages = data?.pages ?? [];
  const canFetchMore = hasNextPage && pages.length < MAX_PAGES;

  // A page we've asked for but not yet received leaves `page` past the end;
  // keep showing the last one we have (dimmed) until it lands.
  const shown = Math.min(page, Math.max(0, pages.length - 1));
  const urls = pages[shown]?.urls ?? [];

  function refresh() {
    setShuffled(true);
    const next = page + 1;
    if (next < pages.length) {
      setPage(next);
    } else if (canFetchMore) {
      setPage(next);
      fetchNextPage();
    } else {
      // Out of ranking worth showing — start the walk over.
      setPage(0);
    }
  }

  return {
    urls,
    // Key the shelf on this: it only moves once the next page is renderable,
    // so the entrance plays on arrival rather than on tap.
    shown,
    shuffled,
    refresh,
    isPending,
    isRefreshing: !isPending && isFetching,
    // A page that fails mid-walk leaves the earlier ones on screen, so only
    // take over the shelf when there's nothing left to show.
    hasFailed: isError && urls.length === 0,
  };
}
