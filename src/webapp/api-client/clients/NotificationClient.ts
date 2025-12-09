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
  markMockNotificationsAsRead,
  markAllMockNotificationsAsRead,
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
    // For development, update mock data
    if (process.env.NODE_ENV === 'development') {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return markMockNotificationsAsRead(request.notificationIds);
    }

    return this.request<MarkNotificationsAsReadResponse>(
      'POST',
      '/api/notifications/mark-read',
      request,
    );
  }

  async markAllNotificationsAsRead(): Promise<MarkAllNotificationsAsReadResponse> {
    // For development, update mock data
    if (process.env.NODE_ENV === 'development') {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return markAllMockNotificationsAsRead();
    }

    return this.request<MarkAllNotificationsAsReadResponse>(
      'POST',
      '/api/notifications/mark-all-read',
    );
  }
}
