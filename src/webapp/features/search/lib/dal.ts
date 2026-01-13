import { createSembleClient } from '@/services/client.apiClient';
import { cache } from 'react';

interface PageParams {
  page?: number;
  limit?: number;
}

interface SemanticSearchParams extends PageParams {
  threshold?: number;
  urlType?: string;
  userId?: string;
}

export const semanticSearchUrls = cache(
  async (query: string, params?: SemanticSearchParams) => {
    const client = createSembleClient();
    const response = await client.semanticSearchUrls({
      query,
      page: params?.page,
      limit: params?.limit,
      threshold: params?.threshold,
      urlType: params?.urlType,
      userId: params?.userId,
    });

    return response;
  },
);
