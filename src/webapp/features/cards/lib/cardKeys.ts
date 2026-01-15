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
  ) => [
    ...cardKeys.all(),
    'infinite',
    didOrHandle,
    limit,
    sortBy,
    sortOrder,
    urlType,
  ],
};
