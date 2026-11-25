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
  // 'URL' or 'ANNOTATION' — annotation cards carry selectors/note instead of
  // link metadata
  cardKind?: 'URL' | 'ANNOTATION';
  // Text quote selectors for annotation cards (ordered by ordinal)
  cardSelectors?: Array<{
    type: string;
    exact: string;
    prefix?: string;
    suffix?: string;
  }>;
  // Plain note text for annotation cards (URL cards use cardNote)
  cardNoteText?: string;
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
  cardUrlConnectionCount?: number;
  cardUrlIsConnected?: boolean;
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

  // Mention notification specific data (optional, only for USER_MENTIONED_YOU)
  mentionSource?: 'NOTE' | 'CONNECTION' | 'COLLECTION';
  mentionCollection?: {
    id: string;
    uri?: string;
    name: string;
    description?: string;
    accessType: string;
    authorId: string;
    cardCount: number;
    createdAt: Date;
    updatedAt: Date;
  };

  // Connection notification specific data (optional, only for connection notifications)
  connectionId?: string;
  connectionType?: string;
  connectionNote?: string;
  connectionCreatedAt?: Date;
  connectionUpdatedAt?: Date;
  connectionCuratorId?: string;
  // URL endpoints carry url + metadata; CARD endpoints carry the annotation
  // card id instead (resolved to a view by the query use case)
  sourceUrl?: string;
  sourceUrlMetadata?: any;
  sourceCardId?: string;
  targetUrl?: string;
  targetUrlMetadata?: any;
  targetCardId?: string;

  // USER_ANNOTATED_YOUR_URL — the annotated URL and the batch of annotation
  // cards created on it within the window
  annotatedUrl?: string;
  annotations?: Array<{
    cardId: string;
    authorId: string;
    url: string;
    uri?: string;
    libraryCount: number;
    selectors: Array<{
      type: string;
      exact: string;
      prefix?: string;
      suffix?: string;
    }>;
    note?: string;
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
  findByConnectionAndActor(
    connectionId: string,
    actorUserId: CuratorId,
  ): Promise<Result<Notification[]>>;
  /**
   * Mention notifications (type USER_MENTIONED_YOU) attached to a given
   * item. Exactly one of the keys should be provided.
   */
  findMentionNotificationsByItem(item: {
    cardId?: string;
    connectionId?: string;
    collectionId?: string;
  }): Promise<Result<Notification[]>>;
  findFollowNotificationsByActorAndTarget(
    actorUserId: CuratorId,
    targetId: string,
    targetType: 'USER' | 'COLLECTION',
  ): Promise<Result<Notification[]>>;
  /**
   * Notifications from one actor to one recipient of the given type created
   * after `since` — used to batch USER_ANNOTATED_YOUR_URL into one
   * notification per (recipient, actor, url) within a time window.
   */
  findByRecipientAndActorSince(
    recipientId: CuratorId,
    actorUserId: CuratorId,
    type: string,
    since: Date,
  ): Promise<Result<Notification[]>>;
  getUnreadCount(recipientId: CuratorId): Promise<Result<number>>;
  markAsRead(notificationIds: NotificationId[]): Promise<Result<void>>;
  markAllAsReadForUser(recipientId: CuratorId): Promise<Result<number>>;
  delete(id: NotificationId): Promise<Result<void>>;
}
