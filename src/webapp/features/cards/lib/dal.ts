import { createApiClient } from '@/services/apiClient';
import { cache } from 'react';

export const getUrlMetadata = cache(async (url: string) => {
  const client = await createApiClient();
  const response = await client.getUrlMetadata(url);

  return response;
});
