'use client';

import { useQueries } from '@tanstack/react-query';
import type { UrlView } from '@/api-client';
import { getUrlMetadata } from '@/features/cards/lib/dal';
import { cardKeys } from '@/features/cards/lib/cardKeys';
import { FALLBACK_TOPICS } from '../topics';
import { useOnboardingProgress } from '../useOnboardingProgress';
import useRecommendedCards from './useRecommendedCards';

const CANDIDATE_LIMIT = 10;

export default function useCardCandidates() {
  const { progress, isLoaded } = useOnboardingProgress();

  // Same key useUrlMetadata writes under, so anything the flow has already
  // looked at costs nothing here.
  const picks = useQueries({
    queries: progress.seedUrls.map((url) => ({
      queryKey: cardKeys.urlMetadata(url, { includeStats: true }),
      queryFn: () => getUrlMetadata({ url, includeStats: true }),
      staleTime: Infinity,
    })),
  });

  const recommendations = useRecommendedCards({
    queries: progress.topics.length > 0 ? progress.topics : FALLBACK_TOPICS,
    limit: CANDIDATE_LIMIT,
    enabled: isLoaded,
  });

  // Dropped rather than shown with zeroed counts: the number on the save
  // button is a real one, and inventing a 0 is a claim.
  const pickViews: UrlView[] = picks.flatMap((query, index) => {
    const stats = query.data?.stats;
    if (!query.data || !stats) return [];

    return [
      {
        url: progress.seedUrls[index],
        metadata: query.data.metadata,
        urlLibraryCount: stats.libraryCount,
        urlConnectionCount: stats.connections.all.total,
      },
    ];
  });

  const recommended =
    recommendations.data?.pages.flatMap((page) => page.urls) ?? [];

  // First occurrence wins, so a recommendation that repeats a pick keeps the
  // pick's position.
  const seen = new Set<string>();
  const candidates = [...pickViews, ...recommended]
    .filter((view) => {
      if (seen.has(view.url)) return false;
      seen.add(view.url);
      return true;
    })
    .slice(0, CANDIDATE_LIMIT);

  return {
    candidates,
    isPending:
      candidates.length === 0 &&
      (!isLoaded ||
        recommendations.isPending ||
        picks.some((query) => query.isPending)),
  };
}
