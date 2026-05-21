import { BaseClient } from './BaseClient';
import {
  GetMyNotificationsParams,
  MarkNotificationsAsReadRequest,
  GetMyNotificationsResponse,
  GetUnreadNotificationCountResponse,
  MarkNotificationsAsReadResponse,
  MarkAllNotificationsAsReadResponse,
  routes,
} from '@semble/types';

export class NotificationClient extends BaseClient {
  async getMyNotifications(
    params?: GetMyNotificationsParams,
  ): Promise<GetMyNotificationsResponse> {
    return this.request<GetMyNotificationsResponse>(
      routes.notifications.myNotifications,
      {
        query: {
          page: params?.page,
          limit: params?.limit,
          sortBy: params?.sortBy,
          sortOrder: params?.sortOrder,
          unreadOnly: params?.unreadOnly,
        },
      },
    );
  }

  async getUnreadNotificationCount(): Promise<GetUnreadNotificationCountResponse> {
    return this.request<GetUnreadNotificationCountResponse>(
      routes.notifications.unreadCount,
    );
  }

  async markNotificationsAsRead(
    request: MarkNotificationsAsReadRequest,
  ): Promise<MarkNotificationsAsReadResponse> {
    return this.request<MarkNotificationsAsReadResponse>(
      routes.notifications.markRead,
      { body: request },
    );
  }

  async markAllNotificationsAsRead(): Promise<MarkAllNotificationsAsReadResponse> {
    return this.request<MarkAllNotificationsAsReadResponse>(
      routes.notifications.markAllRead,
    );
  }
}
