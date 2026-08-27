'use client';

import useRecommendedCards from '@/features/cards/lib/queries/useRecommendedCards';
import { EXPLORE_CARDS_QUERY } from '../exploreCardsQuery';
import useSeedUrls from './useSeedUrls';

/**
 * The seed URLs the recommendation shelves draw from: the first page of the
 * same ranked set the Cards shelf renders.
 *
 * Every shelf calls this for itself rather than being handed the seeds. They
 * share one cache entry and one request, since they all key on
 * `EXPLORE_CARDS_QUERY`, and the first page never changes once loaded — so
 * they settle on the same seeds without a parent holding them. The first page
 * only: walking the Cards shelf mustn't drag the other shelves along.
 */
export default function useExploreSeedUrls() {
  const { data, isPending } = useRecommendedCards(EXPLORE_CARDS_QUERY);

  return useSeedUrls({
    candidates: data?.pages[0]?.urls.map((u) => u.url),
    hasSettled: !isPending,
  });
}
