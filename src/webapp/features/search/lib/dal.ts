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

interface ProfileSearchParams extends PageParams {
  cursor?: string;
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

export const searchAtProtoAccounts = cache(
  async (query: string, params?: ProfileSearchParams) => {
    const client = createSembleClient();
    const response = await client.searchAtProtoAccounts({
      q: query,
      limit: params?.limit,
      cursor: params?.cursor,
    });

    return response;
  },
);
