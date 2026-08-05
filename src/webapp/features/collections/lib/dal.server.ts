import { createServerSembleClient } from '@/services/server.apiClient';
import { CollectionSortField, SortOrder } from '@semble/types';
import { cache } from 'react';

interface MyCollectionsParams {
  page?: number;
  limit?: number;
  collectionSortBy?: CollectionSortField;
  sortOrder?: SortOrder;
  searchText?: string;
}

/**
 * Server-only version of getMyCollections. Authenticates by forwarding the
 * caller's access token, which the client DAL cannot do from a server render
 * (it relies on the browser sending HttpOnly cookies via `credentials: include`).
 *
 * Use in Server Components to prefetch into the same query key the client hook
 * reads. For Client Components use getMyCollections from dal.ts.
 */
export const getMyCollections = cache(async (params?: MyCollectionsParams) => {
  const client = await createServerSembleClient();
  const response = await client.getMyCollections({
    page: params?.page,
    limit: params?.limit,
    sortBy: params?.collectionSortBy,
    sortOrder: params?.sortOrder,
    searchText: params?.searchText,
  });

  // Mirrors the client DAL's temp fix: drop collections that have no uri.
  return {
    ...response,
    collections: response.collections.filter(
      (collection) => collection.uri !== undefined,
    ),
  };
});
