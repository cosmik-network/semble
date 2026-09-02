import { eq, desc, and, count, inArray, or, sql } from 'drizzle-orm';
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
import { publishedRecords } from '../../../cards/infrastructure/repositories/schema/publishedRecord.sql';
import { libraryMemberships } from '../../../cards/infrastructure/repositories/schema/libraryMembership.sql';
import { connections } from '../../../cards/infrastructure/repositories/schema/connection.sql';
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

      // Get notifications and counts concurrently
      // (total and unread counts are merged into a single query)
      const [notificationsResult, countsResult] = await Promise.all([
        this.db
          .select()
          .from(notifications)
          .where(whereClause)
          .orderBy(desc(notifications.createdAt))
          .limit(limit)
          .offset(offset),
        this.db
          .select({
            totalCount: unreadOnly
              ? sql<number>`count(*) filter (where not ${notifications.read})`.mapWith(
                  Number,
                )
              : count(),
            unreadCount:
              sql<number>`count(*) filter (where not ${notifications.read})`.mapWith(
                Number,
              ),
          })
          .from(notifications)
          .where(eq(notifications.recipientUserId, recipientId.value)),
      ]);

      const totalCount = countsResult[0]?.totalCount || 0;
      const unreadCount = countsResult[0]?.unreadCount || 0;

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
      // Filter by actor and cardId in metadata directly in SQL
      const result = await this.db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.actorUserId, actorUserId.value),
            sql`${notifications.metadata}->>'cardId' = ${cardId}`,
          ),
        );

      const matchingNotifications: Notification[] = [];
      for (const notificationData of result) {
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

      return ok(matchingNotifications);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByCard(cardId: string): Promise<Result<Notification[]>> {
    try {
      // Filter by cardId in metadata directly in SQL
      const result = await this.db
        .select()
        .from(notifications)
        .where(sql`${notifications.metadata}->>'cardId' = ${cardId}`);

      const matchingNotifications: Notification[] = [];
      for (const notificationData of result) {
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

      return ok(matchingNotifications);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findMentionNotificationsByItem(item: {
    cardId?: string;
    connectionId?: string;
    collectionId?: string;
  }): Promise<Result<Notification[]>> {
    try {
      const key = item.cardId
        ? sql`${notifications.metadata}->>'cardId' = ${item.cardId}`
        : item.connectionId
          ? sql`${notifications.metadata}->>'connectionId' = ${item.connectionId}`
          : sql`${notifications.metadata}->>'collectionId' = ${item.collectionId}`;

      const result = await this.db
        .select()
        .from(notifications)
        .where(and(eq(notifications.type, 'USER_MENTIONED_YOU'), key));

      const matchingNotifications: Notification[] = [];
      for (const notificationData of result) {
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

      return ok(matchingNotifications);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByConnectionAndActor(
    connectionId: string,
    actorUserId: CuratorId,
  ): Promise<Result<Notification[]>> {
    try {
      // Filter by actor and connectionId in metadata directly in SQL
      const result = await this.db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.actorUserId, actorUserId.value),
            sql`${notifications.metadata}->>'connectionId' = ${connectionId}`,
          ),
        );

      const matchingNotifications: Notification[] = [];
      for (const notificationData of result) {
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

      return ok(matchingNotifications);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findFollowNotificationsByActorAndTarget(
    actorUserId: CuratorId,
    targetId: string,
    targetType: 'USER' | 'COLLECTION',
  ): Promise<Result<Notification[]>> {
    try {
      // Filter by actor and target directly in SQL
      // For USER follows: recipientUserId should match the targetId
      // For COLLECTION follows: metadata.targetId should match
      const targetCondition =
        targetType === 'USER'
          ? and(
              sql`${notifications.metadata}->>'targetType' = 'USER'`,
              eq(notifications.recipientUserId, targetId),
            )
          : and(
              sql`${notifications.metadata}->>'targetType' = 'COLLECTION'`,
              sql`${notifications.metadata}->>'targetId' = ${targetId}`,
            );

      const result = await this.db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.actorUserId, actorUserId.value),
            targetCondition,
          ),
        );

      const matchingNotifications: Notification[] = [];
      for (const notificationData of result) {
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
      const callingUserId = recipientId.value;

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

      // Get the notification page and the counts concurrently
      // (total and unread counts are merged into a single query)
      const [notificationsResult, countsResult] = await Promise.all([
        this.db
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
          .offset(offset),
        this.db
          .select({
            totalCount: unreadOnly
              ? sql<number>`count(*) filter (where not ${notifications.read})`.mapWith(
                  Number,
                )
              : count(),
            unreadCount:
              sql<number>`count(*) filter (where not ${notifications.read})`.mapWith(
                Number,
              ),
          })
          .from(notifications)
          .where(eq(notifications.recipientUserId, recipientId.value)),
      ]);

      const totalCount = countsResult[0]?.totalCount || 0;
      const unreadCount = countsResult[0]?.unreadCount || 0;

      if (notificationsResult.length === 0) {
        return ok({
          notifications: [],
          totalCount,
          hasMore: false,
          unreadCount,
        });
      }

      // Extract card IDs from all notifications
      const cardIds = notificationsResult
        .filter((n) => {
          const metadata = n.metadata as any;
          return metadata?.cardId !== undefined;
        })
        .map((n) => (n.metadata as any)?.cardId)
        .filter(Boolean);

      // Collect collection IDs from USER_FOLLOWED_YOUR_COLLECTION notifications
      const followCollectionIds = notificationsResult
        .filter((n) => {
          const metadata = n.metadata as any;
          return (
            metadata?.targetType === 'COLLECTION' && metadata?.targetId != null
          );
        })
        .map((n) => (n.metadata as any).targetId)
        .filter(Boolean);

      // Collect collection IDs from COLLECTION mention notifications; they
      // share the follow-collection fetch below.
      const mentionCollectionIds = notificationsResult
        .filter((n) => {
          const metadata = n.metadata as any;
          return (
            metadata?.mentionSource === 'COLLECTION' &&
            metadata?.collectionId != null
          );
        })
        .map((n) => (n.metadata as any).collectionId)
        .filter(Boolean);
      const lookupCollectionIds = [
        ...new Set([...followCollectionIds, ...mentionCollectionIds]),
      ];

      // Collect connection IDs from CONNECTION notifications
      const connectionIds = notificationsResult
        .filter((n) => {
          const metadata = n.metadata as any;
          return metadata?.connectionId !== undefined;
        })
        .map((n) => (n.metadata as any).connectionId)
        .filter(Boolean);

      const emptyResult: any[] = [];

      // Run all queries that depend only on the page results in parallel
      const [
        cardsResult,
        notesResult,
        collectionsResult,
        followCollectionsResult,
        connectionsResult,
      ] = await Promise.all([
        // Get card data with published record URIs
        cardIds.length > 0
          ? this.db
              .select({
                id: cards.id,
                authorId: cards.authorId,
                url: cards.url,
                publishedRecordUri: publishedRecords.uri,
                contentData: cards.contentData,
                libraryCount: cards.libraryCount,
                createdAt: cards.createdAt,
                updatedAt: cards.updatedAt,
              })
              .from(cards)
              .leftJoin(
                publishedRecords,
                eq(cards.publishedRecordId, publishedRecords.id),
              )
              .where(
                and(
                  inArray(cards.id, cardIds),
                  eq(cards.type, CardTypeEnum.URL),
                ),
              )
          : Promise.resolve(emptyResult),
        // Get notes for these cards
        cardIds.length > 0
          ? this.db
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
              )
          : Promise.resolve(emptyResult),
        // Get collections for these cards
        cardIds.length > 0
          ? this.db
              .select({
                cardId: collectionCards.cardId,
                collectionId: collections.id,
                collectionUri: publishedRecords.uri,
                collectionName: collections.name,
                collectionDescription: collections.description,
                collectionAccessType: collections.accessType,
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
              .leftJoin(
                publishedRecords,
                eq(collections.publishedRecordId, publishedRecords.id),
              )
              .where(inArray(collectionCards.cardId, cardIds))
          : Promise.resolve(emptyResult),
        // Fetch collection data for follow + collection-mention notifications
        lookupCollectionIds.length > 0
          ? this.db
              .select({
                collectionId: collections.id,
                collectionUri: publishedRecords.uri,
                collectionName: collections.name,
                collectionDescription: collections.description,
                collectionAccessType: collections.accessType,
                collectionAuthorId: collections.authorId,
                collectionCardCount: collections.cardCount,
                collectionCreatedAt: collections.createdAt,
                collectionUpdatedAt: collections.updatedAt,
              })
              .from(collections)
              .leftJoin(
                publishedRecords,
                eq(collections.publishedRecordId, publishedRecords.id),
              )
              .where(inArray(collections.id, lookupCollectionIds))
          : Promise.resolve(emptyResult),
        // Fetch connection data for CONNECTION notifications
        connectionIds.length > 0
          ? this.db
              .select({
                id: connections.id,
                curatorId: connections.curatorId,
                sourceType: connections.sourceType,
                sourceValue: connections.sourceValue,
                sourceUrlMetadata: connections.sourceUrlMetadata,
                targetType: connections.targetType,
                targetValue: connections.targetValue,
                targetUrlMetadata: connections.targetUrlMetadata,
                connectionType: connections.connectionType,
                note: connections.note,
                createdAt: connections.createdAt,
                updatedAt: connections.updatedAt,
              })
              .from(connections)
              .where(inArray(connections.id, connectionIds))
          : Promise.resolve(emptyResult),
      ]);

      // URL-derived queries depend on the card data, so they run in a second stage
      const urlLibraryCountMap = new Map<string, number>();
      const urlInLibrarySet = new Set<string>();
      const urlConnectionCountMap = new Map<string, number>();
      const urlIsConnectedSet = new Set<string>();

      const urls = cardsResult.map((card) => card.url).filter(Boolean);
      if (urls.length > 0) {
        const [
          urlLibraryCountsResult,
          urlInLibraryResult,
          urlConnectionCountsResult,
          urlIsConnectedResult,
        ] = await Promise.all([
          // Get URL library counts for these cards
          this.db
            .select({
              url: cards.url,
              count: countDistinct(libraryMemberships.userId),
            })
            .from(cards)
            .innerJoin(
              libraryMemberships,
              eq(cards.id, libraryMemberships.cardId),
            )
            .where(
              and(eq(cards.type, CardTypeEnum.URL), inArray(cards.url, urls)),
            )
            .groupBy(cards.url),
          // Check which URLs are in the calling user's library
          // More efficient: check if user has a card with matching url and authorId
          this.db
            .select({
              url: cards.url,
            })
            .from(cards)
            .where(
              and(
                eq(cards.type, CardTypeEnum.URL),
                inArray(cards.url, urls),
                eq(cards.authorId, callingUserId),
              ),
            )
            .groupBy(cards.url),
          // Get connection counts for these URLs
          this.db
            .select({
              url: sql<string>`CASE
                WHEN ${connections.sourceType} = 'URL' THEN ${connections.sourceValue}
                WHEN ${connections.targetType} = 'URL' THEN ${connections.targetValue}
              END`.as('url'),
              count: count(),
            })
            .from(connections)
            .where(
              or(
                and(
                  eq(connections.sourceType, 'URL'),
                  inArray(connections.sourceValue, urls),
                ),
                and(
                  eq(connections.targetType, 'URL'),
                  inArray(connections.targetValue, urls),
                ),
              ),
            )
            .groupBy(sql`url`),
          // Check which URLs the calling user has connections with
          this.db
            .select({
              url: sql<string>`CASE
                WHEN ${connections.sourceType} = 'URL' THEN ${connections.sourceValue}
                WHEN ${connections.targetType} = 'URL' THEN ${connections.targetValue}
              END`.as('url'),
            })
            .from(connections)
            .where(
              and(
                eq(connections.curatorId, callingUserId),
                or(
                  and(
                    eq(connections.sourceType, 'URL'),
                    inArray(connections.sourceValue, urls),
                  ),
                  and(
                    eq(connections.targetType, 'URL'),
                    inArray(connections.targetValue, urls),
                  ),
                ),
              ),
            )
            .groupBy(sql`url`),
        ]);

        urlLibraryCountsResult.forEach((row) => {
          if (row.url) {
            urlLibraryCountMap.set(row.url, row.count);
          }
        });

        urlInLibraryResult.forEach((row) => {
          if (row.url) {
            urlInLibrarySet.add(row.url);
          }
        });

        urlConnectionCountsResult.forEach((row) => {
          if (row.url) {
            urlConnectionCountMap.set(row.url, row.count);
          }
        });

        urlIsConnectedResult.forEach((row) => {
          if (row.url) {
            urlIsConnectedSet.add(row.url);
          }
        });
      }

      // Build lookup maps
      const cardMap = new Map(cardsResult.map((card) => [card.id, card]));
      const followCollectionMap = new Map(
        followCollectionsResult.map((c) => [c.collectionId, c]),
      );

      const connectionDataMap = new Map<string, any>();
      connectionsResult.forEach((connection) => {
        connectionDataMap.set(connection.id, connection);
      });

      // Build enriched notifications - process in original chronological order
      const enrichedNotifications: EnrichedNotificationResult[] = [];

      // Process all notifications in original order
      for (const notification of notificationsResult) {
        const metadata = notification.metadata as any;

        // Check if this is a connection notification
        if (metadata?.connectionId !== undefined) {
          const connectionData = connectionDataMap.get(metadata.connectionId);
          if (
            connectionData &&
            connectionData.sourceType === 'URL' &&
            connectionData.targetType === 'URL'
          ) {
            enrichedNotifications.push({
              id: notification.id,
              type: notification.type,
              read: notification.read,
              createdAt: notification.createdAt,
              actorUserId: notification.actorUserId,
              connectionId: metadata.connectionId,
              mentionSource: metadata.mentionSource,
              connectionType: connectionData.connectionType,
              connectionNote: connectionData.note,
              connectionCreatedAt: connectionData.createdAt,
              connectionUpdatedAt: connectionData.updatedAt,
              connectionCuratorId: connectionData.curatorId,
              sourceUrl: connectionData.sourceValue,
              sourceUrlMetadata: connectionData.sourceUrlMetadata,
              targetUrl: connectionData.targetValue,
              targetUrlMetadata: connectionData.targetUrlMetadata,
            });
          }
          continue;
        }

        // Check if this is a collection-description mention notification
        if (
          metadata?.mentionSource === 'COLLECTION' &&
          metadata?.collectionId != null
        ) {
          const collectionData = followCollectionMap.get(metadata.collectionId);
          if (!collectionData) continue;
          enrichedNotifications.push({
            id: notification.id,
            type: notification.type,
            read: notification.read,
            createdAt: notification.createdAt,
            actorUserId: notification.actorUserId,
            mentionSource: metadata.mentionSource,
            mentionCollection: {
              id: collectionData.collectionId,
              uri: collectionData.collectionUri || undefined,
              name: collectionData.collectionName,
              description: collectionData.collectionDescription || undefined,
              accessType: collectionData.collectionAccessType,
              authorId: collectionData.collectionAuthorId,
              cardCount: collectionData.collectionCardCount,
              createdAt: collectionData.collectionCreatedAt,
              updatedAt: collectionData.collectionUpdatedAt,
            },
          });
          continue;
        }

        // Check if this is a follow notification
        if (metadata?.targetType !== undefined) {
          // Handle follow notifications
          if (
            metadata.targetType === 'COLLECTION' &&
            metadata.targetId != null
          ) {
            // USER_FOLLOWED_YOUR_COLLECTION - include collection data
            const collectionData = followCollectionMap.get(metadata.targetId);

            enrichedNotifications.push({
              id: notification.id,
              type: notification.type,
              read: notification.read,
              createdAt: notification.createdAt,
              actorUserId: notification.actorUserId,
              followTargetType: metadata.targetType,
              followTargetId: metadata.targetId,
              followCollections: collectionData
                ? [
                    {
                      id: collectionData.collectionId,
                      uri: collectionData.collectionUri || undefined,
                      name: collectionData.collectionName,
                      description:
                        collectionData.collectionDescription || undefined,
                      accessType: collectionData.collectionAccessType as
                        | 'OPEN'
                        | 'CLOSED',
                      authorId: collectionData.collectionAuthorId,
                      cardCount: collectionData.collectionCardCount,
                      createdAt: collectionData.collectionCreatedAt,
                      updatedAt: collectionData.collectionUpdatedAt,
                    },
                  ]
                : [],
            });
          } else {
            // USER_FOLLOWED_YOU - no collection data
            enrichedNotifications.push({
              id: notification.id,
              type: notification.type,
              read: notification.read,
              createdAt: notification.createdAt,
              actorUserId: notification.actorUserId,
              followTargetType: metadata.targetType,
              followTargetId: metadata.targetId,
            });
          }
        } else if (metadata?.cardId !== undefined) {
          // Handle card-based notifications
          const cardId = metadata.cardId;
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
              accessType: c.collectionAccessType as 'OPEN' | 'CLOSED',
              authorId: c.collectionAuthorId,
              cardCount: c.collectionCardCount,
              createdAt: c.collectionCreatedAt,
              updatedAt: c.collectionUpdatedAt,
            }));

          const urlLibraryCount = urlLibraryCountMap.get(card.url || '') || 0;
          const urlInLibrary = card.url ? urlInLibrarySet.has(card.url) : false;
          const urlConnectionCount =
            urlConnectionCountMap.get(card.url || '') || 0;
          const urlIsConnected = card.url
            ? urlIsConnectedSet.has(card.url)
            : false;

          enrichedNotifications.push({
            id: notification.id,
            type: notification.type,
            read: notification.read,
            createdAt: notification.createdAt,
            actorUserId: notification.actorUserId,
            mentionSource: metadata.mentionSource,
            cardAuthorId: card.authorId,
            cardId: card.id,
            cardUrl: card.url || '',
            cardUri: card.publishedRecordUri || undefined,
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
            cardUrlInLibrary: urlInLibrary,
            cardUrlConnectionCount: urlConnectionCount,
            cardUrlIsConnected: urlIsConnected,
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
      }

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
