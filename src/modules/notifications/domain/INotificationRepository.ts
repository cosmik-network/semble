import { Result } from '../../../shared/core/Result';
import { Notification } from './Notification';
import { NotificationId } from './value-objects/NotificationId';
import { CuratorId } from '../../cards/domain/value-objects/CuratorId';

export interface NotificationQueryOptions {
  page: number;
  limit: number;
  unreadOnly?: boolean;
}

export interface PaginatedNotificationResult {
  notifications: Notification[];
  totalCount: number;
  hasMore: boolean;
  unreadCount: number;
}

export interface INotificationRepository {
  save(notification: Notification): Promise<Result<void>>;
  findById(id: NotificationId): Promise<Result<Notification | null>>;
  findByRecipient(
    recipientId: CuratorId,
    options: NotificationQueryOptions,
  ): Promise<Result<PaginatedNotificationResult>>;
  findByCardAndActor(
    cardId: string,
    actorUserId: CuratorId,
  ): Promise<Result<Notification[]>>;
  getUnreadCount(recipientId: CuratorId): Promise<Result<number>>;
  markAsRead(notificationIds: NotificationId[]): Promise<Result<void>>;
  markAllAsReadForUser(recipientId: CuratorId): Promise<Result<number>>;
  delete(id: NotificationId): Promise<Result<void>>;
}
