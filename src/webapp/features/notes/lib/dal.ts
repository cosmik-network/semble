import { createSembleClient } from '@/services/apiClient';
import { cache } from 'react';

interface PageParams {
  page?: number;
  limit?: number;
}

export const getNoteCardsForUrl = cache(
  async (url: string, params?: PageParams) => {
    const client = createSembleClient();
    const response = await client.getNoteCardsForUrl({
      url,
      page: params?.page,
      limit: params?.limit,
    });

    return response;
  },
);
