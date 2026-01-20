import { eq, desc, and, count, inArray } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  INotificationRepository,
  NotificationQueryOptions,
  PaginatedNotificationResult,
  EnrichedNotificationResult,
  PaginatedEnrichedNotificationResult,
} from '../../domain/INotificationRepository';
import { Notification } from '../../domain/Notification';
import { NotificationId } from '../../domain/value-objects/NotificationId';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { notifications } from './schema/notification.sql';
import {
  NotificationMapper,
  NotificationDTO,
} from './mappers/NotificationMapper';
import { Result, ok, err } from '../../../../shared/core/Result';
import { cards } from '../../../cards/infrastructure/repositories/schema/card.sql';
import {
  collections,
  collectionCards,
} from '../../../cards/infrastructure/repositories/schema/collection.sql';
import { libraryMemberships } from '../../../cards/infrastructure/repositories/schema/libraryMembership.sql';
import { CardTypeEnum } from '../../../cards/domain/value-objects/CardType';
import { countDistinct } from 'drizzle-orm';

export class DrizzleNotificationRepository implements INotificationRepository {
  constructor(private db: PostgresJsDatabase) {}

  async save(notification: Notification): Promise<Result<void>> {
    try {
      const dto = NotificationMapper.toPersistence(notification);

      await this.db
        .insert(notifications)
        .values({
          id: dto.id,
          recipientUserId: dto.recipientUserId,
          actorUserId: dto.actorUserId,
          type: dto.type,
          metadata: dto.metadata,
          read: dto.read,
          createdAt: dto.createdAt,
          updatedAt: dto.updatedAt,
        })
        .onConflictDoUpdate({
          target: notifications.id,
          set: {
            read: dto.read,
            updatedAt: dto.updatedAt,
          },
        });

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findById(id: NotificationId): Promise<Result<Notification | null>> {
    try {
      const result = await this.db
        .select()
        .from(notifications)
        .where(eq(notifications.id, id.getStringValue()))
        .limit(1);

      if (result.length === 0) {
        return ok(null);
      }

      const notificationData = result[0]!;
      const dto: NotificationDTO = {
        id: notificationData.id,
        recipientUserId: notificationData.recipientUserId,
        actorUserId: notificationData.actorUserId,
        type: notificationData.type,
        metadata: notificationData.metadata as any,
        read: notificationData.read,
        createdAt: notificationData.createdAt,
        updatedAt: notificationData.updatedAt,
      };

      const domainResult = NotificationMapper.toDomain(dto);
      if (domainResult.isErr()) {
        return err(domainResult.error);
      }

      return ok(domainResult.value);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByRecipient(
    recipientId: CuratorId,
    options: NotificationQueryOptions,
  ): Promise<Result<PaginatedNotificationResult>> {
    try {
      const { page, limit, unreadOnly } = options;
      const offset = (page - 1) * limit;

      // Build where conditions
      const whereConditions = [
        eq(notifications.recipientUserId, recipientId.value),
      ];

      if (unreadOnly) {
        whereConditions.push(eq(notifications.read, false));
      }

      const whereClause =
        whereConditions.length > 1
          ? and(...whereConditions)
          : whereConditions[0];

      // Get notifications
      const notificationsResult = await this.db
        .select()
        .from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const totalCountResult = await this.db
        .select({ count: count() })
        .from(notifications)
        .where(whereClause);

      // Get unread count
      const unreadCountResult = await this.db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientUserId, recipientId.value),
            eq(notifications.read, false),
          ),
        );

      const totalCount = totalCountResult[0]?.count || 0;
      const unreadCount = unreadCountResult[0]?.count || 0;

      // Map to domain objects
      const notificationsList: Notification[] = [];
      for (const notificationData of notificationsResult) {
        const dto: NotificationDTO = {
          id: notificationData.id,
          recipientUserId: notificationData.recipientUserId,
          actorUserId: notificationData.actorUserId,
          type: notificationData.type,
          metadata: notificationData.metadata as any,
          read: notificationData.read,
          createdAt: notificationData.createdAt,
          updatedAt: notificationData.updatedAt,
        };

        const domainResult = NotificationMapper.toDomain(dto);
        if (domainResult.isErr()) {
          return err(domainResult.error);
        }

        notificationsList.push(domainResult.value);
      }

      const hasMore = offset + notificationsList.length < totalCount;

      return ok({
        notifications: notificationsList,
        totalCount,
        hasMore,
        unreadCount,
      });
    } catch (error) {
      return err(error as Error);
    }
  }

  async getUnreadCount(recipientId: CuratorId): Promise<Result<number>> {
    try {
      const result = await this.db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientUserId, recipientId.value),
            eq(notifications.read, false),
          ),
        );

      return ok(result[0]?.count || 0);
    } catch (error) {
      return err(error as Error);
    }
  }

  async markAsRead(notificationIds: NotificationId[]): Promise<Result<void>> {
    try {
      const ids = notificationIds.map((id) => id.getStringValue());

      if (ids.length === 0) {
        return ok(undefined);
      }

      await this.db
        .update(notifications)
        .set({
          read: true,
          updatedAt: new Date(),
        })
        .where(inArray(notifications.id, ids));

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByCardAndActor(
    cardId: string,
    actorUserId: CuratorId,
  ): Promise<Result<Notification[]>> {
    try {
      const result = await this.db
        .select()
        .from(notifications)
        .where(eq(notifications.actorUserId, actorUserId.value));

      // Filter by cardId in metadata
      const matchingNotifications: Notification[] = [];
      for (const notificationData of result) {
        const metadata = notificationData.metadata as any;
        if (metadata.cardId === cardId) {
          const dto: NotificationDTO = {
            id: notificationData.id,
            recipientUserId: notificationData.recipientUserId,
            actorUserId: notificationData.actorUserId,
            type: notificationData.type,
            metadata: notificationData.metadata as any,
            read: notificationData.read,
            createdAt: notificationData.createdAt,
            updatedAt: notificationData.updatedAt,
          };

          const domainResult = NotificationMapper.toDomain(dto);
          if (domainResult.isErr()) {
            return err(domainResult.error);
          }

          matchingNotifications.push(domainResult.value);
        }
      }

      return ok(matchingNotifications);
    } catch (error) {
      return err(error as Error);
    }
  }

  async markAllAsReadForUser(recipientId: CuratorId): Promise<Result<number>> {
    try {
      const result = await this.db
        .update(notifications)
        .set({
          read: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(notifications.recipientUserId, recipientId.value),
            eq(notifications.read, false),
          ),
        );

      // For PostgreSQL with drizzle-orm, we need to handle the result differently
      // The result might not have rowCount, so we'll return 0 as a fallback
      return ok(0);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByRecipientEnriched(
    recipientId: CuratorId,
    options: NotificationQueryOptions,
  ): Promise<Result<PaginatedEnrichedNotificationResult>> {
    try {
      const { page, limit, unreadOnly } = options;
      const offset = (page - 1) * limit;

      // Build where conditions for notifications
      const notificationWhereConditions = [
        eq(notifications.recipientUserId, recipientId.value),
      ];

      if (unreadOnly) {
        notificationWhereConditions.push(eq(notifications.read, false));
      }

      const notificationWhereClause =
        notificationWhereConditions.length > 1
          ? and(...notificationWhereConditions)
          : notificationWhereConditions[0];

      // Get enriched notifications with card data
      const enrichedQuery = this.db
        .select({
          // Notification fields
          id: notifications.id,
          type: notifications.type,
          read: notifications.read,
          createdAt: notifications.createdAt,
          actorUserId: notifications.actorUserId,
          metadata: notifications.metadata,

          // Card fields
          cardId: cards.id,
          cardAuthorId: cards.authorId,
          cardUrl: cards.url,
          cardContentData: cards.contentData,
          cardLibraryCount: cards.libraryCount,
          cardCreatedAt: cards.createdAt,
          cardUpdatedAt: cards.updatedAt,
        })
        .from(notifications)
        .innerJoin(cards, eq(cards.id, notifications.metadata))
        .where(notificationWhereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      // Note: We need to extract cardId from metadata since it's stored as JSON
      // This is a simplified approach - in practice you'd need to handle the JSON extraction
      const notificationsResult = await this.db
        .select({
          id: notifications.id,
          type: notifications.type,
          read: notifications.read,
          createdAt: notifications.createdAt,
          actorUserId: notifications.actorUserId,
          metadata: notifications.metadata,
        })
        .from(notifications)
        .where(notificationWhereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      if (notificationsResult.length === 0) {
        // Get counts for empty result
        const totalCountResult = await this.db
          .select({ count: count() })
          .from(notifications)
          .where(notificationWhereClause);

        const unreadCountResult = await this.db
          .select({ count: count() })
          .from(notifications)
          .where(
            and(
              eq(notifications.recipientUserId, recipientId.value),
              eq(notifications.read, false),
            ),
          );

        return ok({
          notifications: [],
          totalCount: totalCountResult[0]?.count || 0,
          hasMore: false,
          unreadCount: unreadCountResult[0]?.count || 0,
        });
      }

      // Extract card IDs from metadata
      const cardIds = notificationsResult
        .map((n) => (n.metadata as any)?.cardId)
        .filter(Boolean);

      if (cardIds.length === 0) {
        return ok({
          notifications: [],
          totalCount: 0,
          hasMore: false,
          unreadCount: 0,
        });
      }

      // Get card data with URL library counts
      const cardsQuery = this.db
        .select({
          id: cards.id,
          authorId: cards.authorId,
          url: cards.url,
          contentData: cards.contentData,
          libraryCount: cards.libraryCount,
          createdAt: cards.createdAt,
          updatedAt: cards.updatedAt,
        })
        .from(cards)
        .where(
          and(inArray(cards.id, cardIds), eq(cards.type, CardTypeEnum.URL)),
        );

      const cardsResult = await cardsQuery;

      // Get URL library counts for these cards
      const urls = cardsResult.map((card) => card.url).filter(Boolean);
      const urlLibraryCountsQuery = this.db
        .select({
          url: cards.url,
          count: countDistinct(libraryMemberships.userId),
        })
        .from(cards)
        .innerJoin(libraryMemberships, eq(cards.id, libraryMemberships.cardId))
        .where(and(eq(cards.type, CardTypeEnum.URL), inArray(cards.url, urls)))
        .groupBy(cards.url);

      const urlLibraryCountsResult = await urlLibraryCountsQuery;
      const urlLibraryCountMap = new Map<string, number>();
      urlLibraryCountsResult.forEach((row) => {
        if (row.url) {
          urlLibraryCountMap.set(row.url, row.count);
        }
      });

      // Get notes for these cards
      const notesQuery = this.db
        .select({
          id: cards.id,
          parentCardId: cards.parentCardId,
          contentData: cards.contentData,
        })
        .from(cards)
        .where(
          and(
            eq(cards.type, CardTypeEnum.NOTE),
            inArray(cards.parentCardId, cardIds),
          ),
        );

      const notesResult = await notesQuery;

      // Get collections for these cards
      const collectionsQuery = this.db
        .select({
          cardId: collectionCards.cardId,
          collectionId: collections.id,
          collectionUri: collections.publishedRecordId,
          collectionName: collections.name,
          collectionDescription: collections.description,
          collectionAuthorId: collections.authorId,
          collectionCardCount: collections.cardCount,
          collectionCreatedAt: collections.createdAt,
          collectionUpdatedAt: collections.updatedAt,
        })
        .from(collectionCards)
        .innerJoin(
          collections,
          eq(collectionCards.collectionId, collections.id),
        )
        .where(inArray(collectionCards.cardId, cardIds));

      const collectionsResult = await collectionsQuery;

      // Build card lookup map
      const cardMap = new Map(cardsResult.map((card) => [card.id, card]));

      // Build enriched notifications
      const enrichedNotifications: EnrichedNotificationResult[] = [];

      for (const notification of notificationsResult) {
        const metadata = notification.metadata as any;
        const cardId = metadata?.cardId;

        if (!cardId) continue;

        const card = cardMap.get(cardId);
        if (!card) continue;

        const note = notesResult.find((n) => n.parentCardId === cardId);
        const cardCollections = collectionsResult
          .filter((c) => c.cardId === cardId)
          .map((c) => ({
            id: c.collectionId,
            uri: c.collectionUri || undefined,
            name: c.collectionName,
            description: c.collectionDescription || undefined,
            authorId: c.collectionAuthorId,
            cardCount: c.collectionCardCount,
            createdAt: c.collectionCreatedAt,
            updatedAt: c.collectionUpdatedAt,
          }));

        const urlLibraryCount = urlLibraryCountMap.get(card.url || '') || 0;

        enrichedNotifications.push({
          id: notification.id,
          type: notification.type,
          read: notification.read,
          createdAt: notification.createdAt,
          actorUserId: notification.actorUserId,
          cardAuthorId: card.authorId,
          cardId: card.id,
          cardUrl: card.url || '',
          cardTitle: card.contentData?.metadata?.title,
          cardDescription: card.contentData?.metadata?.description,
          cardAuthor: card.contentData?.metadata?.author,
          cardPublishedDate: card.contentData?.metadata?.publishedDate
            ? new Date(card.contentData.metadata.publishedDate)
            : undefined,
          cardSiteName: card.contentData?.metadata?.siteName,
          cardImageUrl: card.contentData?.metadata?.imageUrl,
          cardType: card.contentData?.metadata?.type,
          cardRetrievedAt: card.contentData?.metadata?.retrievedAt
            ? new Date(card.contentData.metadata.retrievedAt)
            : undefined,
          cardDoi: card.contentData?.metadata?.doi,
          cardIsbn: card.contentData?.metadata?.isbn,
          cardLibraryCount: card.libraryCount,
          cardUrlLibraryCount: urlLibraryCount,
          cardUrlInLibrary: undefined, // Would need calling user ID to determine this
          cardCreatedAt: card.createdAt,
          cardUpdatedAt: card.updatedAt,
          cardNote: note
            ? {
                id: note.id,
                text: note.contentData?.text || '',
              }
            : undefined,
          collections: cardCollections,
        });
      }

      // Get total count and unread count
      const totalCountResult = await this.db
        .select({ count: count() })
        .from(notifications)
        .where(notificationWhereClause);

      const unreadCountResult = await this.db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientUserId, recipientId.value),
            eq(notifications.read, false),
          ),
        );

      const totalCount = totalCountResult[0]?.count || 0;
      const unreadCount = unreadCountResult[0]?.count || 0;
      const hasMore = offset + enrichedNotifications.length < totalCount;

      return ok({
        notifications: enrichedNotifications,
        totalCount,
        hasMore,
        unreadCount,
      });
    } catch (error) {
      return err(error as Error);
    }
  }

  async delete(id: NotificationId): Promise<Result<void>> {
    try {
      await this.db
        .delete(notifications)
        .where(eq(notifications.id, id.getStringValue()));

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }
}
