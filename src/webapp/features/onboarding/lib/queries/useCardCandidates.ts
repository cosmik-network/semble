'use client';

import { useQueries } from '@tanstack/react-query';
import type { UrlView } from '@/api-client';
import { getUrlMetadata } from '@/features/cards/lib/dal';
import { cardKeys } from '@/features/cards/lib/cardKeys';
import { dedupeByUrl } from '../dedupeByUrl';
import { FALLBACK_TOPICS } from '../topics';
import useOnboardingState from '../useOnboardingState';
import useRecommendedCards from './useRecommendedCards';

const CANDIDATE_LIMIT = 10;

export default function useCardCandidates() {
  const { state, isLoaded } = useOnboardingState();

  const seedUrls = state.linksSelected ?? [];
  const topics = state.topicsSelected ?? [];

  // The same key useUrlMetadata writes under, so anything the flow has already
  // looked at is free here.
  const picks = useQueries({
    queries: seedUrls.map((url) => ({
      queryKey: cardKeys.urlMetadata(url, { includeStats: true }),
      queryFn: () => getUrlMetadata({ url, includeStats: true }),
      staleTime: Infinity,
    })),
  });

  const recommendations = useRecommendedCards({
    queries: topics.length > 0 ? topics : FALLBACK_TOPICS,
    limit: CANDIDATE_LIMIT,
    enabled: isLoaded,
  });

  // Dropped rather than shown with zeroed counts: the number on the save
  // button is a real one.
  const pickViews: UrlView[] = picks.flatMap((query, index) => {
    const stats = query.data?.stats;
    if (!query.data || !stats) return [];

    return [
      {
        url: seedUrls[index],
        metadata: query.data.metadata,
        urlLibraryCount: stats.libraryCount,
        urlConnectionCount: stats.connections.all.total,
      },
    ];
  });

  const recommended =
    recommendations.data?.pages.flatMap((page) => page.urls) ?? [];

  // Picks first, so a recommendation that repeats one keeps the pick's place.
  const candidates = dedupeByUrl([...pickViews, ...recommended]).slice(
    0,
    CANDIDATE_LIMIT,
  );

  return {
    candidates,
    isPending:
      candidates.length === 0 &&
      (!isLoaded ||
        recommendations.isPending ||
        picks.some((query) => query.isPending)),
  };
}
