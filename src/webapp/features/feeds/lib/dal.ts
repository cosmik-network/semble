import { createSembleClient } from '@/services/client.apiClient';
import { UrlType } from '@semble/types';
import { cache } from 'react';

interface PageParams {
  page?: number;
  limit?: number;
  urlType?: UrlType;
}

export const getGlobalFeed = cache(async (params?: PageParams) => {
  const client = createSembleClient();
  const response = await client.getGlobalFeed({
    page: params?.page,
    limit: params?.limit,
    urlType: params?.urlType,
  });

  return response;
});

export const getGemsActivityFeed = cache(async (params?: PageParams) => {
  const client = createSembleClient();
  const response = await client.getGemsActivityFeed({
    page: params?.page,
    limit: params?.limit,
    urlType: params?.urlType,
  });

  return response;
});
