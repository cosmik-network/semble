import { createApiClient } from '@/services/apiClient';
import { cache } from 'react';

interface PageParams {
  page?: number;
  limit?: number;
}

export const getCollectionsForUrl = cache(
  async (url: string, params?: PageParams) => {
    const client = await createApiClient();
    const response = await client.getCollectionsForUrl({
      url,
      page: params?.page,
      limit: params?.limit,
    });

    return response;
  },
);
