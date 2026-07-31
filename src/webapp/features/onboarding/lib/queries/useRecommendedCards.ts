import { useInfiniteQuery } from '@tanstack/react-query';
import { getRecommendedUrls } from '../dal';
import { onboardingKeys } from '../onboardingKeys';

interface Props {
  queries: string[];
  limit?: number;
  enabled?: boolean;
}

export default function useRecommendedCards(props: Props) {
  const limit = props.limit ?? 10;

  return useInfiniteQuery({
    queryKey: onboardingKeys.recommendedCardsInfinite(props.queries, limit),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getRecommendedUrls(props.queries, { page: pageParam, limit }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined,
    enabled: (props.enabled ?? true) && props.queries.length > 0,
    // Results are intentionally randomized server-side; don't reshuffle on refocus
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
