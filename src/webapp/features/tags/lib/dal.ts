import { createSembleClient } from '@/services/client.apiClient';
import { GetTagsParams, GetTaggedItemsParams } from '@semble/types';
import { cache } from 'react';

export const getTags = cache(async (params?: GetTagsParams) => {
  const client = createSembleClient();
  return client.getTags(params);
});

export const getTaggedItems = cache(async (params: GetTaggedItemsParams) => {
  const client = createSembleClient();
  return client.getTaggedItems(params);
});
