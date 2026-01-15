import { createSembleClient } from '@/services/client.apiClient';
import { UrlType } from '@semble/types';
import { cache } from 'react';

interface PageParams {
  page?: number;
  limit?: number;
  urlType?: UrlType;
}

interface SimilarUrlsParams extends PageParams {
  threshold?: number;
}

export const getLibrariesForUrl = cache(
  async (url: string, params?: PageParams) => {
    const client = createSembleClient();
    const response = await client.getLibrariesForUrl({
      url,
      page: params?.page,
      limit: params?.limit,
    });

    return response;
  },
);

export const getSimilarUrlsForUrl = cache(
  async (url: string, params?: SimilarUrlsParams & PageParams) => {
    const client = createSembleClient();
    const response = await client.getSimilarUrlsForUrl({
      url,
      page: params?.page,
      limit: params?.limit,
      threshold: params?.threshold,
      urlType: params?.urlType,
    });

    return response;
  },
);
