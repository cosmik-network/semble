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
      const { page, limit, beforeActivityId } = options;
      let filteredActivities = [...this.activities];

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
      const { page, limit, beforeActivityId } = options;
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

  // Test helper methods
  clear(): void {
    this.activities = [];
  }

  getAll(): FeedActivity[] {
    return [...this.activities];
  }
}
