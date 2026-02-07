import { Result, ok, err } from '../../../../shared/core/Result';
import {
  IFeedRepository,
  FeedQueryOptions,
  PaginatedFeedResult,
} from '../../domain/IFeedRepository';
import { FeedActivity, CardCollectedMetadata } from '../../domain/FeedActivity';
import { ActivityId } from '../../domain/value-objects/ActivityId';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';

export class InMemoryFeedRepository implements IFeedRepository {
  private static instance: InMemoryFeedRepository | null = null;
  private activities: FeedActivity[] = [];
  // Store following feed items as Map<userId, Set<activityId>>
  private followingFeedItems: Map<string, Set<string>> = new Map();

  private constructor() {}

  public static getInstance(): InMemoryFeedRepository {
    if (!InMemoryFeedRepository.instance) {
      InMemoryFeedRepository.instance = new InMemoryFeedRepository();
    }
    return InMemoryFeedRepository.instance;
  }

  public static resetInstance(): void {
    InMemoryFeedRepository.instance = null;
  }

  async addActivity(activity: FeedActivity): Promise<Result<void>> {
    try {
      this.activities.push(activity);
      // Sort by creation time descending
      this.activities.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async getGlobalFeed(
    options: FeedQueryOptions,
  ): Promise<Result<PaginatedFeedResult>> {
    try {
      const { page, limit, beforeActivityId, urlType } = options;
      let filteredActivities = [...this.activities];

      // Filter by URL type if provided
      if (urlType) {
        filteredActivities = filteredActivities.filter(
          (activity) => activity.urlType === urlType,
        );
      }

      // Filter by cursor if provided
      if (beforeActivityId) {
        const beforeIndex = filteredActivities.findIndex((activity) =>
          activity.activityId.equals(beforeActivityId),
        );
        if (beforeIndex >= 0) {
          filteredActivities = filteredActivities.slice(beforeIndex + 1);
        }
      }

      // Paginate
      const offset = (page - 1) * limit;
      const paginatedActivities = filteredActivities.slice(
        offset,
        offset + limit,
      );

      const totalCount = this.activities.length;
      const hasMore = offset + paginatedActivities.length < totalCount;

      let nextCursor: ActivityId | undefined;
      if (hasMore && paginatedActivities.length > 0) {
        nextCursor =
          paginatedActivities[paginatedActivities.length - 1]!.activityId;
      }

      return ok({
        activities: paginatedActivities,
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
      const { page, limit, beforeActivityId, urlType } = options;
      const collectionIdStrings = collectionIds.map((id) =>
        id.getStringValue(),
      );

      // Filter activities that have matching collection IDs
      let filteredActivities = this.activities.filter((activity) => {
        if (activity.cardCollected) {
          const metadata = activity.metadata as CardCollectedMetadata;
          return (
            metadata.collectionIds?.some((id) =>
              collectionIdStrings.includes(id),
            ) || false
          );
        }
        return false;
      });

      // Filter by URL type if provided
      if (urlType) {
        filteredActivities = filteredActivities.filter(
          (activity) => activity.urlType === urlType,
        );
      }

      // Apply cursor filtering if needed
      if (beforeActivityId) {
        const beforeIndex = filteredActivities.findIndex((activity) =>
          activity.activityId.equals(beforeActivityId),
        );
        if (beforeIndex >= 0) {
          filteredActivities = filteredActivities.slice(beforeIndex + 1);
        }
      }

      // Paginate
      const offset = (page - 1) * limit;
      const paginatedActivities = filteredActivities.slice(
        offset,
        offset + limit,
      );

      const totalCount = filteredActivities.length;
      const hasMore = offset + paginatedActivities.length < totalCount;

      let nextCursor: ActivityId | undefined;
      if (hasMore && paginatedActivities.length > 0) {
        nextCursor =
          paginatedActivities[paginatedActivities.length - 1]!.activityId;
      }

      return ok({
        activities: paginatedActivities,
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
      const activity = this.activities.find((a) =>
        a.activityId.equals(activityId),
      );
      return ok(activity || null);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findRecentCardCollectedActivity(
    actorId: import('../../../cards/domain/value-objects/CuratorId').CuratorId,
    cardId: import('../../../cards/domain/value-objects/CardId').CardId,
    withinMinutes: number,
  ): Promise<Result<FeedActivity | null>> {
    try {
      const cutoffTime = new Date(Date.now() - withinMinutes * 60 * 1000);

      const recentActivity = this.activities.find((activity) => {
        if (!activity.cardCollected) return false;

        const metadata = activity.metadata as CardCollectedMetadata;
        return (
          activity.actorId.value === actorId.value &&
          metadata.cardId === cardId.getStringValue() &&
          activity.createdAt >= cutoffTime
        );
      });

      return ok(recentActivity || null);
    } catch (error) {
      return err(error as Error);
    }
  }

  async updateActivity(activity: FeedActivity): Promise<Result<void>> {
    try {
      const index = this.activities.findIndex((a) =>
        a.activityId.equals(activity.activityId),
      );

      if (index >= 0) {
        this.activities[index] = activity;
        // Re-sort after update
        this.activities.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
      }

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async fanOutActivityToFollowers(
    activityId: ActivityId,
    followerIds: string[],
    createdAt: Date,
  ): Promise<Result<void>> {
    try {
      if (followerIds.length === 0) {
        return ok(undefined);
      }

      const activityIdString = activityId.getStringValue();

      for (const userId of followerIds) {
        if (!this.followingFeedItems.has(userId)) {
          this.followingFeedItems.set(userId, new Set());
        }
        this.followingFeedItems.get(userId)!.add(activityIdString);
      }

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async getFollowingFeed(
    userId: string,
    options: FeedQueryOptions,
  ): Promise<Result<PaginatedFeedResult>> {
    try {
      const { page, limit, beforeActivityId, urlType } = options;

      // Get activity IDs for this user's following feed
      const userActivityIds = this.followingFeedItems.get(userId) || new Set();

      // Filter activities that are in this user's following feed
      let filteredActivities = this.activities.filter((activity) =>
        userActivityIds.has(activity.activityId.getStringValue()),
      );

      // Filter by URL type if provided
      if (urlType) {
        filteredActivities = filteredActivities.filter(
          (activity) => activity.urlType === urlType,
        );
      }

      // Filter by cursor if provided
      if (beforeActivityId) {
        const beforeIndex = filteredActivities.findIndex((activity) =>
          activity.activityId.equals(beforeActivityId),
        );
        if (beforeIndex >= 0) {
          filteredActivities = filteredActivities.slice(beforeIndex + 1);
        }
      }

      // Paginate
      const offset = (page - 1) * limit;
      const paginatedActivities = filteredActivities.slice(
        offset,
        offset + limit,
      );

      const totalCount = filteredActivities.length;
      const hasMore = offset + paginatedActivities.length < totalCount;

      let nextCursor: ActivityId | undefined;
      if (hasMore && paginatedActivities.length > 0) {
        nextCursor =
          paginatedActivities[paginatedActivities.length - 1]!.activityId;
      }

      return ok({
        activities: paginatedActivities,
        totalCount,
        hasMore,
        nextCursor,
      });
    } catch (error) {
      return err(error as Error);
    }
  }

  // Test helper methods
  clear(): void {
    this.activities = [];
    this.followingFeedItems.clear();
  }

  getAll(): FeedActivity[] {
    return [...this.activities];
  }
}
