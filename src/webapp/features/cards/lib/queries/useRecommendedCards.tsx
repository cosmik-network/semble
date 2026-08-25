import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { UrlType } from '@semble/types';
import { getRecommendedUrls } from '../dal';
import { cardKeys } from '../cardKeys';
import { RankingWeights } from '../types/rankingWeights';

interface Props {
  // Empty array lets the server derive queries from the user's recent
  // library cards (or profile bio). The derived queries come back in the
  // response so pagination can pass them explicitly.
  queries: string[];
  limit?: number;
  // Lets callers hold the request until stored queries have been read, so the
  // first fetch isn't wasted on an empty-query set that gets replaced.
  enabled?: boolean;
  // Ranking weight overrides; changing these re-ranks server-side.
  weights?: Partial<RankingWeights>;
  // Bump to force a fresh pick with otherwise identical inputs.
  nonce?: number;
  // Keep showing the previous pick while a new one loads.
  keepPreviousData?: boolean;
  urlType?: UrlType;
}

export default function useRecommendedCards(props: Props) {
  const limit = props.limit ?? 10;

  return useInfiniteQuery({
    enabled: props.enabled ?? true,
    queryKey: cardKeys.recommendedInfinite(
      props.queries,
      limit,
      props.weights,
      props.nonce,
      props.urlType,
    ),
    placeholderData: props.keepPreviousData ? keepPreviousData : undefined,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getRecommendedUrls({
        queries: props.queries,
        page: pageParam,
        limit,
        weights: props.weights,
        urlType: props.urlType,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined,
    // Results are intentionally randomized server-side; don't reshuffle on refocus
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
