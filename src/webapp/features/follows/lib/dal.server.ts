import { createServerSembleClient } from '@/services/server.apiClient';
import { cache } from 'react';

/** Server-only twin of getFollowingCollections in dal.ts; forwards the access token cookie. */
export const getFollowingCollections = cache(
  async (identifier: string, params?: { page?: number; limit?: number }) => {
    const client = await createServerSembleClient();
    const response = await client.getFollowingCollections({
      identifier,
      page: params?.page,
      limit: params?.limit,
    });

    return {
      ...response,
      collections: response.collections.filter((c) => !!c.uri),
    };
  },
);
