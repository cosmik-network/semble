import { createServerSembleClient } from '@/services/server.apiClient';
import { cache } from 'react';

/**
 * Server-only version of getProfile that includes authentication.
 * This version passes the caller's access token, enabling the backend
 * to return personalized data like isFollowing status.
 *
 * Use this in Server Components only.
 * For Client Components, use getProfile from dal.ts instead.
 */
export const getProfile = cache(async (didOrHandle: string) => {
  const client = await createServerSembleClient();
  const response = await client.getProfile({
    identifier: didOrHandle,
  });

  return response;
});
