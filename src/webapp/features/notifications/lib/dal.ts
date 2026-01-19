import { verifySessionOnClient } from '@/lib/auth/dal';
import { createSembleClient } from '@/services/client.apiClient';
import { cache } from 'react';

interface PageParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export const getMyNotifications = cache(async (params?: PageParams) => {
  const client = createSembleClient();
  const response = await client.getMyNotifications({
    page: params?.page,
    limit: params?.limit,
    unreadOnly: params?.unreadOnly,
  });

  return response;
});

export const getUnreadNotificationCount = cache(async () => {
  const session = await verifySessionOnClient({ redirectOnFail: true });
  if (!session) throw new Error('No session found');

  const client = createSembleClient();
  const response = await client.getUnreadNotificationCount();
  return response;
});
