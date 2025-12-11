import { BaseClient } from './BaseClient';
import {
  GetMyNotificationsParams,
  MarkNotificationsAsReadRequest,
  GetMyNotificationsResponse,
  GetUnreadNotificationCountResponse,
  MarkNotificationsAsReadResponse,
  MarkAllNotificationsAsReadResponse,
} from '@semble/types';

export class NotificationClient extends BaseClient {
  async getMyNotifications(
    params?: GetMyNotificationsParams,
  ): Promise<GetMyNotificationsResponse> {
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
    return this.request<GetUnreadNotificationCountResponse>(
      'GET',
      '/api/notifications/unread-count',
    );
  }

  async markNotificationsAsRead(
    request: MarkNotificationsAsReadRequest,
  ): Promise<MarkNotificationsAsReadResponse> {
    return this.request<MarkNotificationsAsReadResponse>(
      'POST',
      '/api/notifications/mark-read',
      request,
    );
  }

  async markAllNotificationsAsRead(): Promise<MarkAllNotificationsAsReadResponse> {
    return this.request<MarkAllNotificationsAsReadResponse>(
      'POST',
      '/api/notifications/mark-all-read',
    );
  }
}
