import { CardSortField, CollectionSortField, SortOrder } from '@semble/types';

export const collectionKeys = {
  all: () => ['collections'] as const,
  collection: (id: string) => [...collectionKeys.all(), id] as const,
  mine: (limit?: number, query?: string) =>
    [...collectionKeys.all(), 'mine', query, limit] as const,
  search: (searchText: string, limit?: number, sortBy?: string) => [
    ...collectionKeys.all(),
    'search',
    searchText,
    limit,
    sortBy,
  ] as const,
  bySembleUrl: (url: string) => [...collectionKeys.all(), url],
  infinite: (
    id?: string,
    limit?: number,
    sortBy?: CollectionSortField | CardSortField,
    sortOrder?: SortOrder,
    query?: string,
  ) => [
    ...collectionKeys.all(),
    'infinite',
    id,
    limit,
    sortBy,
    sortOrder,
    query,
  ],
};
