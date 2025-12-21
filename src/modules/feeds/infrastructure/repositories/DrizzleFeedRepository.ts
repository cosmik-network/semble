import { eq, desc, lt, count, sql, and } from 'drizzle-orm';
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

export class DrizzleFeedRepository implements IFeedRepository {
  constructor(private db: PostgresJsDatabase) {}

  async addActivity(activity: FeedActivity): Promise<Result<void>> {
    try {
      const dto = FeedActivityMapper.toPersistence(activity);

      await this.db.insert(feedActivities).values({
        id: dto.id,
        actorId: dto.actorId,
        type: dto.type,
        metadata: dto.metadata,
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
        type: string;
        metadata: any;
        createdAt: Date;
      }>;

      if (beforeActivityId) {
        // Get the timestamp of the beforeActivityId
        const beforeActivity = await this.db
          .select({ createdAt: feedActivities.createdAt })
          .from(feedActivities)
          .where(eq(feedActivities.id, beforeActivityId.getStringValue()))
          .limit(1);

        if (beforeActivity.length > 0) {
          activitiesResult = await this.db
            .select()
            .from(feedActivities)
            .where(lt(feedActivities.createdAt, beforeActivity[0]!.createdAt))
            .orderBy(desc(feedActivities.createdAt), desc(feedActivities.id))
            .limit(limit);
        } else {
          // If beforeActivityId doesn't exist, return empty result
          activitiesResult = [];
        }
      } else {
        // Regular pagination without cursor
        activitiesResult = await this.db
          .select()
          .from(feedActivities)
          .orderBy(desc(feedActivities.createdAt), desc(feedActivities.id))
          .limit(limit)
          .offset(offset);
      }

      // Get total count
      const totalCountResult = await this.db
        .select({ count: count() })
        .from(feedActivities);

      const totalCount = totalCountResult[0]?.count || 0;

      // Map to domain objects
      const activities: FeedActivity[] = [];
      for (const activityData of activitiesResult) {
        const dto: FeedActivityDTO = {
          id: activityData.id,
          actorId: activityData.actorId,
          type: activityData.type,
          metadata: activityData.metadata as any,
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
        type: string;
        metadata: any;
        createdAt: Date;
      }>;

      // Create the JSON array condition using jsonb_array_elements_text
      const jsonArrayCondition = sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${feedActivities.metadata}->'collectionIds') AS collection_id
        WHERE collection_id = ANY(${collectionIdStrings})
      )`;

      if (beforeActivityId) {
        // Get the timestamp of the beforeActivityId
        const beforeActivity = await this.db
          .select({ createdAt: feedActivities.createdAt })
          .from(feedActivities)
          .where(eq(feedActivities.id, beforeActivityId.getStringValue()))
          .limit(1);

        if (beforeActivity.length > 0) {
          activitiesResult = await this.db
            .select()
            .from(feedActivities)
            .where(
              and(
                lt(feedActivities.createdAt, beforeActivity[0]!.createdAt),
                jsonArrayCondition,
              ),
            )
            .orderBy(desc(feedActivities.createdAt), desc(feedActivities.id))
            .limit(limit);
        } else {
          // If beforeActivityId doesn't exist, return empty result
          activitiesResult = [];
        }
      } else {
        // Regular pagination without cursor
        activitiesResult = await this.db
          .select()
          .from(feedActivities)
          .where(jsonArrayCondition)
          .orderBy(desc(feedActivities.createdAt), desc(feedActivities.id))
          .limit(limit)
          .offset(offset);
      }

      // Get total count with same filter
      const totalCountResult = await this.db
        .select({ count: count() })
        .from(feedActivities)
        .where(jsonArrayCondition);

      const totalCount = totalCountResult[0]?.count || 0;

      // Map to domain objects
      const activities: FeedActivity[] = [];
      for (const activityData of activitiesResult) {
        const dto: FeedActivityDTO = {
          id: activityData.id,
          actorId: activityData.actorId,
          type: activityData.type,
          metadata: activityData.metadata as any,
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
        type: activityData.type,
        metadata: activityData.metadata as any,
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
}
