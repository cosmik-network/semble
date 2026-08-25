import { NoSessionError } from '@/api-client/errors';
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
  if (!session) throw new NoSessionError();
  const client = createSembleClient();
  const response = await client.getMyProfile({ includeStats });

  return response;
});

export const getRecommendedUsers = async (urls: string[]) => {
  const client = createSembleClient();
  return client.getRecommendedUsers({ urls });
};
