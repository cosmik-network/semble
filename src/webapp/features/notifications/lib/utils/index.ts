import type {
  NotificationItem,
  ConnectionCreatedNotificationItem,
  CardCollectionNotificationItem,
  FollowNotificationItem,
} from '@/api-client';
import { NotificationType } from '@/api-client';

export type NotificationKind = 'connection' | 'follow' | 'cardCollection';

type ClassifiedNotification =
  | {
      kind: 'connection';
      item: ConnectionCreatedNotificationItem;
    }
  | { kind: 'follow'; item: FollowNotificationItem }
  | { kind: 'cardCollection'; item: CardCollectionNotificationItem };

export const classifyNotification = (
  item: NotificationItem,
): ClassifiedNotification => {
  switch (item.type) {
    case NotificationType.USER_CONNECTED_YOUR_URL:
    case NotificationType.USER_CONNECTED_YOUR_POST:
    case NotificationType.USER_CONNECTED_YOUR_COLLECTION:
      return { kind: 'connection', item };
    case NotificationType.USER_FOLLOWED_YOU:
    case NotificationType.USER_FOLLOWED_YOUR_COLLECTION:
      return { kind: 'follow', item };
    case NotificationType.USER_ADDED_YOUR_CARD:
    case NotificationType.USER_ADDED_YOUR_BSKY_POST:
    case NotificationType.USER_ADDED_YOUR_COLLECTION:
    case NotificationType.USER_ADDED_TO_YOUR_COLLECTION:
      return { kind: 'cardCollection', item };
  }
};
