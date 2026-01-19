import {
  INotificationRepository,
  NotificationQueryOptions,
  PaginatedNotificationResult,
} from '../../domain/INotificationRepository';
import { Notification } from '../../domain/Notification';
import { NotificationId } from '../../domain/value-objects/NotificationId';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { Result, ok, err } from '../../../../shared/core/Result';

export class InMemoryNotificationRepository implements INotificationRepository {
  private static instance: InMemoryNotificationRepository;
  private notifications: Map<string, Notification> = new Map();

  private constructor() {}

  public static getInstance(): InMemoryNotificationRepository {
    if (!InMemoryNotificationRepository.instance) {
      InMemoryNotificationRepository.instance =
        new InMemoryNotificationRepository();
    }
    return InMemoryNotificationRepository.instance;
  }

  public static resetInstance(): void {
    if (InMemoryNotificationRepository.instance) {
      InMemoryNotificationRepository.instance.notifications.clear();
    }
  }

  async save(notification: Notification): Promise<Result<void>> {
    this.notifications.set(
      notification.notificationId.getStringValue(),
      notification,
    );
    return ok(undefined);
  }

  async findById(id: NotificationId): Promise<Result<Notification | null>> {
    const notification = this.notifications.get(id.getStringValue());
    return ok(notification || null);
  }

  async findByRecipient(
    recipientId: CuratorId,
    options: NotificationQueryOptions,
  ): Promise<Result<PaginatedNotificationResult>> {
    const { page, limit, unreadOnly } = options;
    const offset = (page - 1) * limit;

    // Filter notifications by recipient
    let filteredNotifications = Array.from(this.notifications.values()).filter(
      (notification) => notification.recipientUserId.equals(recipientId),
    );

    // Filter by read status if requested
    if (unreadOnly) {
      filteredNotifications = filteredNotifications.filter(
        (notification) => !notification.read,
      );
    }

    // Sort by creation date (newest first)
    filteredNotifications.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const totalCount = filteredNotifications.length;
    const paginatedNotifications = filteredNotifications.slice(
      offset,
      offset + limit,
    );
    const hasMore = offset + paginatedNotifications.length < totalCount;

    // Calculate unread count
    const unreadCount = Array.from(this.notifications.values()).filter(
      (notification) =>
        notification.recipientUserId.equals(recipientId) && !notification.read,
    ).length;

    return ok({
      notifications: paginatedNotifications,
      totalCount,
      hasMore,
      unreadCount,
    });
  }

  async getUnreadCount(recipientId: CuratorId): Promise<Result<number>> {
    const unreadCount = Array.from(this.notifications.values()).filter(
      (notification) =>
        notification.recipientUserId.equals(recipientId) && !notification.read,
    ).length;

    return ok(unreadCount);
  }

  async markAsRead(notificationIds: NotificationId[]): Promise<Result<void>> {
    for (const id of notificationIds) {
      const notification = this.notifications.get(id.getStringValue());
      if (notification) {
        notification.markAsRead();
      }
    }
    return ok(undefined);
  }

  async findByCardAndActor(
    cardId: string,
    actorUserId: CuratorId,
  ): Promise<Result<Notification[]>> {
    const matchingNotifications = Array.from(this.notifications.values()).filter(
      (notification) =>
        notification.metadata.cardId === cardId &&
        notification.actorUserId.equals(actorUserId),
    );

    return ok(matchingNotifications);
  }

  async markAllAsReadForUser(recipientId: CuratorId): Promise<Result<number>> {
    let markedCount = 0;

    for (const notification of this.notifications.values()) {
      if (
        notification.recipientUserId.equals(recipientId) &&
        !notification.read
      ) {
        notification.markAsRead();
        markedCount++;
      }
    }

    return ok(markedCount);
  }

  async delete(id: NotificationId): Promise<Result<void>> {
    this.notifications.delete(id.getStringValue());
    return ok(undefined);
  }
}
