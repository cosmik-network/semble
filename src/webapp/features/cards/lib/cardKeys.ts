import { CardSortField, SortOrder, UrlType } from '@semble/types';

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
  // Deliberately NOT under cardKeys.all(): saving or connecting invalidates
  // that whole prefix, which would refetch the recommendations and reshuffle
  // the list under the user. Individual cards refresh their own state via
  // cardKeys.urlMetadata instead.
  recommended: () => ['recommended-cards'] as const,
  recommendedInfinite: (queries: string[], limit?: number) =>
    [...cardKeys.recommended(), 'infinite', limit, ...queries] as const,
};
