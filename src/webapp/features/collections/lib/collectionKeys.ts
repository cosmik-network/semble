import { CardSortField, CollectionSortField } from '@semble/types';

export const collectionKeys = {
  all: () => ['collections'] as const,
  collection: (id: string) => [...collectionKeys.all(), id] as const,
  mine: (limit?: number, query?: string) =>
    [...collectionKeys.all(), 'mine', query, limit] as const,
  search: (query: string) => [...collectionKeys.all(), 'search', query],
  bySembleUrl: (url: string) => [...collectionKeys.all(), url],
  infinite: (
    id?: string,
    limit?: number,
    sortBy?: CollectionSortField | CardSortField,
    query?: string,
  ) => [...collectionKeys.all(), 'infinite', id, limit, sortBy, query],
};
