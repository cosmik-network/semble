import { eq, desc, lt, count, sql, and, gte } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  IFeedRepository,
  FeedQueryOptions,
  PaginatedFeedResult,
} from '../../domain/IFeedRepository';
import { FeedActivity } from '../../domain/FeedActivity';
import { ActivityId } from '../../domain/value-objects/ActivityId';
import { feedActivities } from './schema/feedActivity.sql';
import {
  FeedActivityMapper,
  FeedActivityDTO,
} from './mappers/FeedActivityMapper';
import { Result, ok, err } from '../../../../shared/core/Result';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { ActivityTypeEnum } from '../../domain/value-objects/ActivityType';
import { ActivitySource } from '@semble/types';

export class DrizzleFeedRepository implements IFeedRepository {
  constructor(private db: PostgresJsDatabase) {}

  async addActivity(activity: FeedActivity): Promise<Result<void>> {
    try {
      const dto = FeedActivityMapper.toPersistence(activity);

      await this.db.insert(feedActivities).values({
        id: dto.id,
        actorId: dto.actorId,
        cardId: dto.cardId,
        type: dto.type,
        metadata: dto.metadata,
        urlType: dto.urlType,
        source: dto.source,
        createdAt: dto.createdAt,
      });

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async getGlobalFeed(
    options: FeedQueryOptions,
  ): Promise<Result<PaginatedFeedResult>> {
    try {
      const { page, limit, beforeActivityId } = options;
      const offset = (page - 1) * limit;

      // Build query conditionally
      let activitiesResult: Array<{
        id: string;
        actorId: string;
        cardId: string | null;
        type: string;
        metadata: any;
        urlType: string | null;
        source: string | null;
        createdAt: Date;
      }>;

      // Build where conditions
      const whereConditions = [];
      if (options.urlType) {
        whereConditions.push(eq(feedActivities.urlType, options.urlType));
      }
      if (options.source) {
        if (options.source === ActivitySource.SEMBLE) {
          // Semble content has source IS NULL
          whereConditions.push(sql`${feedActivities.source} IS NULL`);
        } else {
          // Direct match for other sources (e.g., ActivitySource.MARGIN)
          whereConditions.push(eq(feedActivities.source, options.source));
        }
      }

      if (beforeActivityId) {
        // Get the timestamp of the beforeActivityId
        const beforeActivity = await this.db
          .select({ createdAt: feedActivities.createdAt })
          .from(feedActivities)
          .where(eq(feedActivities.id, beforeActivityId.getStringValue()))
          .limit(1);

        if (beforeActivity.length > 0) {
          const conditions = [
            lt(feedActivities.createdAt, beforeActivity[0]!.createdAt),
            ...whereConditions,
          ];
          activitiesResult = await this.db
            .select()
            .from(feedActivities)
            .where(conditions.length > 1 ? and(...conditions) : conditions[0])
            .orderBy(desc(feedActivities.createdAt), desc(feedActivities.id))
            .limit(limit);
        } else {
          // If beforeActivityId doesn't exist, return empty result
          activitiesResult = [];
        }
      } else {
        // Regular pagination without cursor
        const query = this.db.select().from(feedActivities);

        if (whereConditions.length > 0) {
          query.where(
            whereConditions.length > 1
              ? and(...whereConditions)
              : whereConditions[0],
          );
        }

        activitiesResult = await query
          .orderBy(desc(feedActivities.createdAt), desc(feedActivities.id))
          .limit(limit)
          .offset(offset);
      }

      // Get total count with same filters
      const countQuery = this.db
        .select({ count: count() })
        .from(feedActivities);

      if (whereConditions.length > 0) {
        countQuery.where(
          whereConditions.length > 1
            ? and(...whereConditions)
            : whereConditions[0],
        );
      }

      const totalCountResult = await countQuery;

      const totalCount = totalCountResult[0]?.count || 0;

      // Map to domain objects
      const activities: FeedActivity[] = [];
      for (const activityData of activitiesResult) {
        const dto: FeedActivityDTO = {
          id: activityData.id,
          actorId: activityData.actorId,
          cardId: activityData.cardId || undefined,
          type: activityData.type,
          metadata: activityData.metadata as any,
          urlType: activityData.urlType || undefined,
          source: activityData.source || undefined,
          createdAt: activityData.createdAt,
        };

        const domainResult = FeedActivityMapper.toDomain(dto);
        if (domainResult.isErr()) {
          return err(domainResult.error);
        }

        activities.push(domainResult.value);
      }

      // Determine if there are more activities
      const hasMore = offset + activities.length < totalCount;

      // Set next cursor if there are more activities
      let nextCursor: ActivityId | undefined;
      if (hasMore && activities.length > 0) {
        const lastActivity = activities[activities.length - 1]!;
        nextCursor = lastActivity.activityId;
      }

      return ok({
        activities,
        totalCount,
        hasMore,
        nextCursor,
      });
    } catch (error) {
      return err(error as Error);
    }
  }

  async getGemsFeed(
    collectionIds: CollectionId[],
    options: FeedQueryOptions,
  ): Promise<Result<PaginatedFeedResult>> {
    try {
      const { page, limit, beforeActivityId } = options;
      const offset = (page - 1) * limit;
      const collectionIdStrings = collectionIds.map((id) =>
        id.getStringValue(),
      );

      // Handle empty collection IDs array
      if (collectionIdStrings.length === 0) {
        return ok({
          activities: [],
          totalCount: 0,
          hasMore: false,
          nextCursor: undefined,
        });
      }

      // Build query conditionally
      let activitiesResult: Array<{
        id: string;
        actorId: string;
        cardId: string | null;
        type: string;
        metadata: any;
        urlType: string | null;
        source: string | null;
        createdAt: Date;
      }>;

      // Build where conditions for gems feed
      const whereConditions = [];
      if (options.urlType) {
        whereConditions.push(eq(feedActivities.urlType, options.urlType));
      }
      if (options.source) {
        if (options.source === ActivitySource.SEMBLE) {
          // Semble content has source IS NULL
          whereConditions.push(sql`${feedActivities.source} IS NULL`);
        } else {
          // Direct match for other sources (e.g., ActivitySource.MARGIN)
          whereConditions.push(eq(feedActivities.source, options.source));
        }
      }

      // Create the JSON array condition using jsonb_array_elements_text
      const arrayLiteral = `{${collectionIdStrings.map((id) => `"${id}"`).join(',')}}`;
      const jsonArrayCondition = sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${feedActivities.metadata}->'collectionIds') AS collection_id
        WHERE collection_id = ANY(${arrayLiteral}::text[])
      )`;

      if (beforeActivityId) {
        // Get the timestamp of the beforeActivityId
        const beforeActivity = await this.db
          .select({ createdAt: feedActivities.createdAt })
          .from(feedActivities)
          .where(eq(feedActivities.id, beforeActivityId.getStringValue()))
          .limit(1);

        if (beforeActivity.length > 0) {
          const conditions = [
            lt(feedActivities.createdAt, beforeActivity[0]!.createdAt),
            jsonArrayCondition,
            ...whereConditions,
          ];
          activitiesResult = await this.db
            .select()
            .from(feedActivities)
            .where(and(...conditions))
            .orderBy(desc(feedActivities.createdAt), desc(feedActivities.id))
            .limit(limit);
        } else {
          // If beforeActivityId doesn't exist, return empty result
          activitiesResult = [];
        }
      } else {
        // Regular pagination without cursor
        const conditions = [jsonArrayCondition, ...whereConditions];
        activitiesResult = await this.db
          .select()
          .from(feedActivities)
          .where(conditions.length > 1 ? and(...conditions) : conditions[0])
          .orderBy(desc(feedActivities.createdAt), desc(feedActivities.id))
          .limit(limit)
          .offset(offset);
      }

      // Get total count with same filter
      const conditions = [jsonArrayCondition];
      if (options.urlType) {
        conditions.push(eq(feedActivities.urlType, options.urlType));
      }

      const totalCountResult = await this.db
        .select({ count: count() })
        .from(feedActivities)
        .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

      const totalCount = totalCountResult[0]?.count || 0;

      // Map to domain objects
      const activities: FeedActivity[] = [];
      for (const activityData of activitiesResult) {
        const dto: FeedActivityDTO = {
          id: activityData.id,
          actorId: activityData.actorId,
          cardId: activityData.cardId || undefined,
          type: activityData.type,
          metadata: activityData.metadata as any,
          urlType: activityData.urlType || undefined,
          source: activityData.source || undefined,
          createdAt: activityData.createdAt,
        };

        const domainResult = FeedActivityMapper.toDomain(dto);
        if (domainResult.isErr()) {
          return err(domainResult.error);
        }

        activities.push(domainResult.value);
      }

      // Determine if there are more activities
      const hasMore = offset + activities.length < totalCount;

      // Set next cursor if there are more activities
      let nextCursor: ActivityId | undefined;
      if (hasMore && activities.length > 0) {
        const lastActivity = activities[activities.length - 1]!;
        nextCursor = lastActivity.activityId;
      }

      return ok({
        activities,
        totalCount,
        hasMore,
        nextCursor,
      });
    } catch (error) {
      return err(error as Error);
    }
  }

  async findById(activityId: ActivityId): Promise<Result<FeedActivity | null>> {
    try {
      const activityResult = await this.db
        .select()
        .from(feedActivities)
        .where(eq(feedActivities.id, activityId.getStringValue()))
        .limit(1);

      if (activityResult.length === 0) {
        return ok(null);
      }

      const activityData = activityResult[0]!;
      const dto: FeedActivityDTO = {
        id: activityData.id,
        actorId: activityData.actorId,
        cardId: activityData.cardId || undefined,
        type: activityData.type,
        metadata: activityData.metadata as any,
        urlType: activityData.urlType || undefined,
        createdAt: activityData.createdAt,
      };

      const domainResult = FeedActivityMapper.toDomain(dto);
      if (domainResult.isErr()) {
        return err(domainResult.error);
      }

      return ok(domainResult.value);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findRecentCardCollectedActivity(
    actorId: CuratorId,
    cardId: CardId,
    withinMinutes: number,
  ): Promise<Result<FeedActivity | null>> {
    try {
      const cutoffTime = new Date(Date.now() - withinMinutes * 60 * 1000);

      const result = await this.db
        .select()
        .from(feedActivities)
        .where(
          and(
            eq(feedActivities.actorId, actorId.value),
            eq(feedActivities.cardId, cardId.getStringValue()),
            eq(feedActivities.type, ActivityTypeEnum.CARD_COLLECTED),
            gte(feedActivities.createdAt, cutoffTime),
          ),
        )
        .orderBy(desc(feedActivities.createdAt))
        .limit(1);

      if (result.length === 0) {
        return ok(null);
      }

      const activityData = result[0]!;
      const dto: FeedActivityDTO = {
        id: activityData.id,
        actorId: activityData.actorId,
        cardId: activityData.cardId || undefined,
        type: activityData.type,
        metadata: activityData.metadata as any,
        urlType: activityData.urlType || undefined,
        createdAt: activityData.createdAt,
      };

      const domainResult = FeedActivityMapper.toDomain(dto);
      if (domainResult.isErr()) {
        return err(domainResult.error);
      }

      return ok(domainResult.value);
    } catch (error) {
      return err(error as Error);
    }
  }

  async updateActivity(activity: FeedActivity): Promise<Result<void>> {
    try {
      const dto = FeedActivityMapper.toPersistence(activity);

      await this.db
        .update(feedActivities)
        .set({
          metadata: dto.metadata,
          urlType: dto.urlType,
        })
        .where(eq(feedActivities.id, dto.id));

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }
}
