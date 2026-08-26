import { CardSortField, SortOrder, UrlType } from '@semble/types';
import { RankingWeights } from './types/rankingWeights';

export const cardKeys = {
  all: () => ['cards'] as const,
  card: (id: string) => [...cardKeys.all(), id] as const,
  byUrl: (url: string) => [...cardKeys.all(), url] as const,
  mine: (limit?: number) => [...cardKeys.all(), 'mine', limit] as const,
  search: (query: string) => [...cardKeys.all(), 'search', query],
  bySembleUrl: (url: string) => [...cardKeys.all(), url],
  libraries: (id: string) => [...cardKeys.all(), 'libraries', id],
  infinite: (
    didOrHandle?: string,
    limit?: number,
    sortBy?: CardSortField,
    sortOrder?: SortOrder,
    urlType?: UrlType,
    uncollected?: boolean,
    searchText?: string,
  ) => [
    ...cardKeys.all(),
    'infinite',
    didOrHandle,
    limit,
    sortBy,
    sortOrder,
    urlType,
    uncollected,
    searchText,
  ],
  urlMetadata: (url: string, options?: { includeStats?: boolean }) =>
    [...cardKeys.all(), 'metadata', url, options] as const,
  // The subset of a URL's stats a card in a list can show: save/connect counts
  // and the reader's own status. Deliberately separate from urlMetadata, which
  // holds the authoritative full stats the semble and collection tabs read — a
  // list only knows this subset, so seeding it into urlMetadata would mean
  // padding the rest with zeros the tabs would then display.
  urlStatuses: () => [...cardKeys.all(), 'url-status'] as const,
  urlStatus: (url: string) => [...cardKeys.urlStatuses(), url] as const,
  // Deliberately NOT under cardKeys.all(): saving or connecting invalidates
  // that whole prefix, which would refetch the recommendations and reshuffle
  // the list under the user. Individual cards refresh their own state via
  // cardKeys.urlMetadata instead.
  recommended: () => ['recommended-cards'] as const,
  // Outside cardKeys.all() for the same reason as recommended() above, except
  // here the cost is refetching every loaded page mid-scroll.
  searchResults: () => ['card-search'] as const,
  searchResultsInfinite: (
    searchQuery: string,
    limit?: number,
    sortBy?: CardSortField,
    sortOrder?: SortOrder,
    urlType?: UrlType,
  ) =>
    [
      ...cardKeys.searchResults(),
      'infinite',
      searchQuery,
      limit,
      sortBy,
      sortOrder,
      urlType,
    ] as const,
  // Weights are part of the key so adjusting one refetches the re-ranked list
  // instead of showing the previously cached order. `nonce` does the same for
  // a caller that wants a fresh pick with unchanged queries and weights.
  recommendedInfinite: (
    queries: string[],
    limit?: number,
    weights?: Partial<RankingWeights>,
    nonce?: number,
    urlType?: UrlType,
  ) =>
    [
      ...cardKeys.recommended(),
      'infinite',
      limit,
      weights ?? null,
      nonce ?? 0,
      urlType ?? null,
      ...queries,
    ] as const,
};
