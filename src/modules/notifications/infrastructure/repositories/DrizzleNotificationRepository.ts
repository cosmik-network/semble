import { eq, desc, and, count } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  INotificationRepository,
  NotificationQueryOptions,
  PaginatedNotificationResult,
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

      const whereClause = whereConditions.length > 1 
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
      const ids = notificationIds.map(id => id.getStringValue());
      
      await this.db
        .update(notifications)
        .set({ 
          read: true, 
          updatedAt: new Date() 
        })
        .where(eq(notifications.id, ids[0])); // This will need to be updated for multiple IDs

      // For multiple IDs, we'd need to use a different approach
      if (ids.length > 1) {
        for (const id of ids.slice(1)) {
          await this.db
            .update(notifications)
            .set({ 
              read: true, 
              updatedAt: new Date() 
            })
            .where(eq(notifications.id, id));
        }
      }

      return ok(undefined);
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
          updatedAt: new Date() 
        })
        .where(
          and(
            eq(notifications.recipientUserId, recipientId.value),
            eq(notifications.read, false),
          ),
        );

      // Note: Different databases return different formats for affected rows
      // This might need adjustment based on your specific setup
      return ok(result.rowCount || 0);
    } catch (error) {
      return err(error as Error);
    }
  }
}
