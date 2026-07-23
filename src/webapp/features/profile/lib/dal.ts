import { createSembleClient } from '@/services/client.apiClient';
import { cache } from 'react';

export const getProfile = cache(
  async (didOrHandle: string, includeStats?: boolean) => {
    const client = createSembleClient();
    const response = await client.getProfile({
      identifier: didOrHandle,
      includeStats,
    });

    return response;
  },
);

export const getMyProfile = cache(async (includeStats?: boolean) => {
  const client = createSembleClient();
  const response = await client.getMyProfile({ includeStats });

  return response;
});
