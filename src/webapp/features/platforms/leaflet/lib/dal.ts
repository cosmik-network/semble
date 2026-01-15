import { createSembleClient } from '@/services/client.apiClient';
import { cache } from 'react';

interface SearchParams {
  url: string;
  limit?: number;
  cursor?: string;
}

export const searchLeafletDocs = cache(async (params: SearchParams) => {
  const client = createSembleClient();
  const response = await client.searchLeafletDocs({
    url: params.url,
    limit: params?.limit,
    cursor: params.cursor,
  });

  return response;
});
