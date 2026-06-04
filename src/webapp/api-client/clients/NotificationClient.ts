import { BaseClient } from './BaseClient';
import { unwrap } from '../unwrap';
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
    return unwrap<GetMyNotificationsResponse>(res);
  }

  async getUnreadNotificationCount(): Promise<GetUnreadNotificationCountResponse> {
    const res = await this.client.notifications.unreadCount({ query: {} });
    return unwrap<GetUnreadNotificationCountResponse>(res);
  }

  async markNotificationsAsRead(
    request: MarkNotificationsAsReadRequest,
  ): Promise<MarkNotificationsAsReadResponse> {
    const res = await this.client.notifications.markRead({ body: request });
    return unwrap<MarkNotificationsAsReadResponse>(res);
  }

  async markAllNotificationsAsRead(): Promise<MarkAllNotificationsAsReadResponse> {
    const res = await this.client.notifications.markAllRead({ body: {} });
    return unwrap<MarkAllNotificationsAsReadResponse>(res);
  }
}
