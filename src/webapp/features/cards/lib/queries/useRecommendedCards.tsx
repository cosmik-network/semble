import { useInfiniteQuery } from '@tanstack/react-query';
import { getRecommendedUrls } from '../dal';
import { cardKeys } from '../cardKeys';

interface Props {
  // Empty array lets the server derive queries from the user's recent
  // library cards (or profile bio). The derived queries come back in the
  // response so pagination can pass them explicitly.
  queries: string[];
  limit?: number;
  // Lets callers hold the request until stored queries have been read, so the
  // first fetch isn't wasted on an empty-query set that gets replaced.
  enabled?: boolean;
}

export default function useRecommendedCards(props: Props) {
  const limit = props.limit ?? 10;

  return useInfiniteQuery({
    enabled: props.enabled ?? true,
    queryKey: cardKeys.recommendedInfinite(props.queries, limit),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getRecommendedUrls({ queries: props.queries, page: pageParam, limit }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined,
    // Results are intentionally randomized server-side; don't reshuffle on refocus
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
