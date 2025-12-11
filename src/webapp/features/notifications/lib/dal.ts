import { createSembleClient } from '@/services/apiClient';
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
  const client = createSembleClient();
  const response = await client.getUnreadNotificationCount();
  return response;
});
