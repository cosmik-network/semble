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

export interface EnrichedNotificationResult {
  // Core notification data
  id: string;
  type: string;
  read: boolean;
  createdAt: Date;

  // User IDs (still need profile enrichment)
  actorUserId: string;
  cardAuthorId?: string; // Optional for follow notifications

  // Card data - fully enriched from JOIN (optional for follow notifications)
  cardId?: string;
  cardUrl?: string;
  cardUri?: string;
  cardTitle?: string;
  cardDescription?: string;
  cardAuthor?: string;
  cardPublishedDate?: Date;
  cardSiteName?: string;
  cardImageUrl?: string;
  cardType?: string;
  cardRetrievedAt?: Date;
  cardDoi?: string;
  cardIsbn?: string;
  cardLibraryCount?: number;
  cardUrlLibraryCount?: number;
  cardUrlInLibrary?: boolean;
  cardCreatedAt?: Date;
  cardUpdatedAt?: Date;
  cardNote?: {
    id: string;
    text: string;
  };

  // Collections - fully enriched from JOIN (optional for follow notifications)
  collections?: Array<{
    id: string;
    uri?: string;
    name: string;
    description?: string;
    accessType: string;
    authorId: string; // Still need profile enrichment
    cardCount: number;
    createdAt: Date;
    updatedAt: Date;
  }>;

  // Follow notification specific data (optional, only present for follow notifications)
  followTargetType?: 'USER' | 'COLLECTION';
  followTargetId?: string; // Collection ID if following a collection
  followCollections?: Array<{
    id: string;
    uri?: string;
    name: string;
    description?: string;
    accessType: string;
    authorId: string;
    cardCount: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export interface PaginatedEnrichedNotificationResult {
  notifications: EnrichedNotificationResult[];
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
  findByRecipientEnriched(
    recipientId: CuratorId,
    options: NotificationQueryOptions,
  ): Promise<Result<PaginatedEnrichedNotificationResult>>;
  findByCardAndActor(
    cardId: string,
    actorUserId: CuratorId,
  ): Promise<Result<Notification[]>>;
  findByCard(cardId: string): Promise<Result<Notification[]>>;
  findFollowNotificationsByActorAndTarget(
    actorUserId: CuratorId,
    targetId: string,
    targetType: 'USER' | 'COLLECTION',
  ): Promise<Result<Notification[]>>;
  getUnreadCount(recipientId: CuratorId): Promise<Result<number>>;
  markAsRead(notificationIds: NotificationId[]): Promise<Result<void>>;
  markAllAsReadForUser(recipientId: CuratorId): Promise<Result<number>>;
  delete(id: NotificationId): Promise<Result<void>>;
}
