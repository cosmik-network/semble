import { BaseClient } from './BaseClient';
import {
  GetMyNotificationsParams,
  MarkNotificationsAsReadRequest,
  GetMyNotificationsResponse,
  GetUnreadNotificationCountResponse,
  MarkNotificationsAsReadResponse,
  MarkAllNotificationsAsReadResponse,
} from '@semble/types';
import {
  getMockNotifications,
  getMockUnreadCount,
  mockNotifications,
} from '../mock-data/notifications';

export class NotificationClient extends BaseClient {
  async getMyNotifications(
    params?: GetMyNotificationsParams,
  ): Promise<GetMyNotificationsResponse> {
    // For development, return mock data
    if (process.env.NODE_ENV === 'development') {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 300));
      return getMockNotifications({
        page: params?.page,
        limit: params?.limit,
        unreadOnly: params?.unreadOnly,
      });
    }

    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.unreadOnly) searchParams.set('unreadOnly', 'true');

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/notifications?${queryString}`
      : '/api/notifications';

    return this.request<GetMyNotificationsResponse>('GET', endpoint);
  }

  async getUnreadNotificationCount(): Promise<GetUnreadNotificationCountResponse> {
    // For development, return mock data
    if (process.env.NODE_ENV === 'development') {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 100));
      return getMockUnreadCount();
    }

    return this.request<GetUnreadNotificationCountResponse>(
      'GET',
      '/api/notifications/unread-count',
    );
  }

  async markNotificationsAsRead(
    request: MarkNotificationsAsReadRequest,
  ): Promise<MarkNotificationsAsReadResponse> {
    // For development, simulate marking as read
    if (process.env.NODE_ENV === 'development') {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 200));

      // In a real implementation, this would update the backend
      // For now, just return the count of IDs that would be marked
      const markedCount = request.notificationIds.length;

      return { markedCount };
    }

    return this.request<MarkNotificationsAsReadResponse>(
      'POST',
      '/api/notifications/mark-read',
      request,
    );
  }

  async markAllNotificationsAsRead(): Promise<MarkAllNotificationsAsReadResponse> {
    // For development, simulate marking all as read
    if (process.env.NODE_ENV === 'development') {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Count unread notifications
      const unreadCount = mockNotifications.filter((n) => !n.read).length;

      return { markedCount: unreadCount };
    }

    return this.request<MarkAllNotificationsAsReadResponse>(
      'POST',
      '/api/notifications/mark-all-read',
    );
  }
}
