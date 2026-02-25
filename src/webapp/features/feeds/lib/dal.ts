import { createSembleClient } from '@/services/client.apiClient';
import { UrlType, ActivitySource } from '@semble/types';
import { cache } from 'react';
import { verifySessionOnClient } from '@/lib/auth/dal';

interface PageParams {
  page?: number;
  limit?: number;
  urlType?: UrlType;
  source?: ActivitySource;
}

export const getGlobalFeed = cache(async (params?: PageParams) => {
  const client = createSembleClient();
  const response = await client.getGlobalFeed({
    page: params?.page,
    limit: params?.limit,
    urlType: params?.urlType,
    source: params?.source,
  });

  return response;
});

export const getGemsActivityFeed = cache(async (params?: PageParams) => {
  const client = createSembleClient();
  const response = await client.getGemsActivityFeed({
    page: params?.page,
    limit: params?.limit,
    urlType: params?.urlType,
    source: params?.source,
  });

  return response;
});

export const getFollowingFeed = cache(async (params?: PageParams) => {
  const session = await verifySessionOnClient({ redirectOnFail: true });
  if (!session) throw new Error('No session found');

  const client = createSembleClient();
  const response = await client.getFollowingFeed({
    page: params?.page,
    limit: params?.limit,
    urlType: params?.urlType,
    source: params?.source,
  });

  return response;
});
