import {
  CardSortField,
  CollectionAccessType,
  CollectionSortField,
  SortOrder,
  UrlType,
} from '@semble/types';

export const collectionKeys = {
  all: () => ['collections'] as const,
  collection: (id: string) => [...collectionKeys.all(), id] as const,
  mine: (limit?: number, query?: string) =>
    [...collectionKeys.all(), 'mine', query, limit] as const,
  search: (
    searchText?: string,
    limit?: number,
    sortBy?: string,
    accessType?: CollectionAccessType,
    identifier?: string,
    sortOrder?: SortOrder,
  ) =>
    [
      ...collectionKeys.all(),
      'search',
      searchText,
      limit,
      sortBy,
      accessType,
      identifier,
      sortOrder,
    ] as const,
  bySembleUrl: (url: string) => [...collectionKeys.all(), url],
  recommended: (urls: string[]) =>
    [...collectionKeys.all(), 'recommended', ...urls] as const,
  recommendedForUrl: (url: string, limit?: number) =>
    [...collectionKeys.all(), 'recommendedForUrl', url, limit] as const,
  infinite: (
    id?: string,
    limit?: number,
    sortBy?: CollectionSortField | CardSortField,
    sortOrder?: SortOrder,
    query?: string,
    urlType?: UrlType,
  ) => [
    ...collectionKeys.all(),
    'infinite',
    id,
    limit,
    sortBy,
    sortOrder,
    query,
    urlType,
  ],
};
