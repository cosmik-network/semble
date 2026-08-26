import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { UrlType } from '@semble/types';
import { getRecommendedUrls } from '../dal';
import { cardKeys } from '../cardKeys';
import { RankingWeights } from '../types/rankingWeights';
import {
  readStoredQueries,
  writeStoredQueries,
} from '../utils/recommendedQueriesStorage';

interface PageParam {
  page: number;
  // The queries the server resolved for the previous page, carried forward so
  // every page reads the same ranked set. Absent on the first page, which is
  // the only request allowed to leave the derivation to the server.
  queries?: string[];
}

// Typed so the query infers `PageParam` rather than the narrower `{page: 1}`.
const FIRST_PAGE: PageParam = { page: 1 };

interface Props {
  // Empty (or omitted) lets the server derive queries from the user's recent
  // library cards (or profile bio). The derived queries come back in the
  // response and are carried into later pages via the page param.
  queries?: string[];
  limit?: number;
  enabled?: boolean;
  // Ranking weight overrides; changing these re-ranks server-side.
  weights?: Partial<RankingWeights>;
  // Bump to force a fresh pick with otherwise identical inputs.
  nonce?: number;
  // Keep showing the previous pick while a new one loads.
  keepPreviousData?: boolean;
  urlType?: UrlType;
  // Pins the server-derived queries in local storage and reuses them on the
  // next first-page request, so a reload or a filter change re-reads the same
  // recommendations instead of seeding from a fresh random sample. Only for
  // signed-in readers: a guest's queries come from the global feed and mustn't
  // be stored as if they were personalised.
  pinQueries?: boolean;
}

export default function useRecommendedCards(props: Props) {
  const limit = props.limit ?? 10;
  const explicitQueries = props.queries ?? [];

  return useInfiniteQuery({
    enabled: props.enabled ?? true,
    queryKey: cardKeys.recommendedInfinite(
      explicitQueries,
      limit,
      props.weights,
      props.nonce,
      props.urlType,
    ),
    placeholderData: props.keepPreviousData ? keepPreviousData : undefined,
    initialPageParam: FIRST_PAGE,
    queryFn: async ({ pageParam }) => {
      // Precedence: queries carried from the previous page, then the caller's
      // explicit ones, then a pin from an earlier visit. Falling through to
      // empty hands the derivation to the server.
      const requested =
        pageParam.queries ??
        (explicitQueries.length > 0
          ? explicitQueries
          : props.pinQueries
            ? readStoredQueries()
            : []);

      const response = await getRecommendedUrls({
        queries: requested,
        page: pageParam.page,
        limit,
        weights: props.weights,
        urlType: props.urlType,
      });

      // Only worth pinning when the server did the deriving — anything we sent
      // is either already pinned or the caller's own.
      if (
        props.pinQueries &&
        requested.length === 0 &&
        response.queries.length > 0
      ) {
        writeStoredQueries(response.queries);
      }

      return response;
    },
    getNextPageParam: (lastPage): PageParam | undefined =>
      lastPage.pagination.hasMore
        ? {
            page: lastPage.pagination.currentPage + 1,
            queries: lastPage.queries,
          }
        : undefined,
    // Results are intentionally randomized server-side; don't reshuffle on refocus
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
