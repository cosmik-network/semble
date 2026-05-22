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
    const res = await this.client.notifications.myNotifications({
      query: {
        page: params?.page,
        limit: params?.limit,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder,
        unreadOnly: params?.unreadOnly,
      },
    });
    return res.body as GetMyNotificationsResponse;
  }

  async getUnreadNotificationCount(): Promise<GetUnreadNotificationCountResponse> {
    const res = await this.client.notifications.unreadCount({ query: {} });
    return res.body as GetUnreadNotificationCountResponse;
  }

  async markNotificationsAsRead(
    request: MarkNotificationsAsReadRequest,
  ): Promise<MarkNotificationsAsReadResponse> {
    const res = await this.client.notifications.markRead({ body: request });
    return res.body as MarkNotificationsAsReadResponse;
  }

  async markAllNotificationsAsRead(): Promise<MarkAllNotificationsAsReadResponse> {
    const res = await this.client.notifications.markAllRead({ body: {} });
    return res.body as MarkAllNotificationsAsReadResponse;
  }
}
