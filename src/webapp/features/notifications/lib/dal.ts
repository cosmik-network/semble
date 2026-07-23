import { createSembleClient } from '@/services/client.apiClient';
import { cache } from 'react';

interface PageParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export const getMyNotifications = cache(async (params?: PageParams) => {
  const client = createSembleClient();
  return client.getMyNotifications({
    page: params?.page,
    limit: params?.limit,
    unreadOnly: params?.unreadOnly,
  });
});

export const getUnreadNotificationCount = cache(async () => {
  const client = createSembleClient();
  return client.getUnreadNotificationCount();
});
