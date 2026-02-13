import {
  INotificationRepository,
  NotificationQueryOptions,
  PaginatedNotificationResult,
  PaginatedEnrichedNotificationResult,
  EnrichedNotificationResult,
} from '../../domain/INotificationRepository';
import { Notification } from '../../domain/Notification';
import { NotificationId } from '../../domain/value-objects/NotificationId';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { Result, ok, err } from '../../../../shared/core/Result';
import { ICardQueryRepository } from '../../../cards/domain/ICardQueryRepository';

export class InMemoryNotificationRepository implements INotificationRepository {
  private static instance: InMemoryNotificationRepository;
  private notifications: Map<string, Notification> = new Map();
  private cardQueryRepository?: ICardQueryRepository;

  private constructor() {}

  // Method to inject dependencies after singleton creation
  public setDependencies(cardQueryRepository: ICardQueryRepository): void {
    this.cardQueryRepository = cardQueryRepository;
  }

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
    const matchingNotifications = Array.from(
      this.notifications.values(),
    ).filter(
      (notification) =>
        notification.metadata.cardId === cardId &&
        notification.actorUserId.equals(actorUserId),
    );

    return ok(matchingNotifications);
  }

  async findByCard(cardId: string): Promise<Result<Notification[]>> {
    const matchingNotifications = Array.from(
      this.notifications.values(),
    ).filter((notification) => notification.metadata.cardId === cardId);

    return ok(matchingNotifications);
  }

  async findFollowNotificationsByActorAndTarget(
    actorUserId: CuratorId,
    targetId: string,
    targetType: 'USER' | 'COLLECTION',
  ): Promise<Result<Notification[]>> {
    const matchingNotifications = Array.from(
      this.notifications.values(),
    ).filter((notification) => {
      // Must match the actor (follower)
      if (!notification.actorUserId.equals(actorUserId)) {
        return false;
      }

      const metadata = notification.metadata as any;

      if (targetType === 'USER') {
        // For USER follows: recipientUserId should match the targetId
        return (
          metadata.targetType === 'USER' &&
          notification.recipientUserId.value === targetId
        );
      } else if (targetType === 'COLLECTION') {
        // For COLLECTION follows: metadata.targetId should match
        return (
          metadata.targetType === 'COLLECTION' && metadata.targetId === targetId
        );
      }

      return false;
    });

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

  async findByRecipientEnriched(
    recipientId: CuratorId,
    options: NotificationQueryOptions,
  ): Promise<Result<PaginatedEnrichedNotificationResult>> {
    // If dependencies not set, return empty result
    if (!this.cardQueryRepository) {
      return ok({
        notifications: [],
        totalCount: 0,
        hasMore: false,
        unreadCount: 0,
      });
    }

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

    // Enrich notifications with card data using cardQueryRepository
    const enrichedNotifications: EnrichedNotificationResult[] = [];

    for (const notification of paginatedNotifications) {
      const cardId = notification.metadata.cardId;
      if (!cardId) continue;

      // Get enriched card data using the card query repository
      const cardView = await this.cardQueryRepository.getUrlCardView(
        cardId,
        recipientId.value,
      );

      if (!cardView) continue;

      // Build enriched notification result
      enrichedNotifications.push({
        id: notification.notificationId.getStringValue(),
        type: notification.type.value, // Extract the NotificationTypeEnum value as string
        read: notification.read,
        createdAt: notification.createdAt,
        actorUserId: notification.actorUserId.value,
        cardAuthorId: cardView.authorId,
        cardId: cardView.id,
        cardUrl: cardView.url,
        cardTitle: cardView.cardContent.title,
        cardDescription: cardView.cardContent.description,
        cardAuthor: cardView.cardContent.author,
        cardPublishedDate: undefined, // Not in cardView
        cardSiteName: undefined, // Not in cardView
        cardImageUrl: cardView.cardContent.imageUrl,
        cardType: undefined, // Not in cardView
        cardRetrievedAt: undefined, // Not in cardView
        cardDoi: undefined, // Not in cardView
        cardIsbn: undefined, // Not in cardView
        cardLibraryCount: cardView.libraryCount,
        cardUrlLibraryCount: cardView.urlLibraryCount,
        cardUrlInLibrary: cardView.urlInLibrary,
        cardCreatedAt: cardView.createdAt,
        cardUpdatedAt: cardView.updatedAt,
        cardNote: cardView.note,
        collections: cardView.collections.map((c) => ({
          id: c.id,
          uri: `at://${c.authorId}/network.cosmik.local.collection/${c.id}`,
          name: c.name,
          description: undefined, // Not in collection result
          accessType: c.accessType,
          authorId: c.authorId,
          cardCount: 0, // Not in collection result
          createdAt: new Date(), // Not in collection result
          updatedAt: new Date(), // Not in collection result
        })),
      });
    }

    return ok({
      notifications: enrichedNotifications,
      totalCount,
      hasMore,
      unreadCount,
    });
  }

  async delete(id: NotificationId): Promise<Result<void>> {
    this.notifications.delete(id.getStringValue());
    return ok(undefined);
  }
}
