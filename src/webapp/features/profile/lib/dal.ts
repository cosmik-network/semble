import { verifySessionOnClient } from '@/lib/auth/dal';
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
  const session = await verifySessionOnClient({ redirectOnFail: true });
  if (!session) throw new Error('No session found');
  const client = createSembleClient();
  const response = await client.getMyProfile({ includeStats });

  return response;
});
