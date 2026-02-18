import { CollectionId } from 'src/modules/cards/domain/value-objects/CollectionId';
import { Result } from '../../../shared/core/Result';
import { FeedActivity } from './FeedActivity';
import { ActivityId } from './value-objects/ActivityId';
import { UrlType } from '../../cards/domain/value-objects/UrlType';
import { ActivitySource } from '@semble/types';

export interface FeedQueryOptions {
  page: number;
  limit: number;
  beforeActivityId?: ActivityId; // For cursor-based pagination
  urlType?: UrlType; // Filter by URL type
  source?: ActivitySource; // Filter by activity source
}

export interface PaginatedFeedResult {
  activities: FeedActivity[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: ActivityId; // For cursor-based pagination
}

export interface IFeedRepository {
  addActivity(activity: FeedActivity): Promise<Result<void>>;
  getGlobalFeed(
    options: FeedQueryOptions,
  ): Promise<Result<PaginatedFeedResult>>;
  getGemsFeed(
    collectionIds: CollectionId[],
    options: FeedQueryOptions,
  ): Promise<Result<PaginatedFeedResult>>;
  findById(activityId: ActivityId): Promise<Result<FeedActivity | null>>;
  findRecentCardCollectedActivity(
    actorId: import('../../cards/domain/value-objects/CuratorId').CuratorId,
    cardId: import('../../cards/domain/value-objects/CardId').CardId,
    withinMinutes: number,
  ): Promise<Result<FeedActivity | null>>;
  updateActivity(activity: FeedActivity): Promise<Result<void>>;

  /**
   * Fan-out an activity to multiple followers' following feeds.
   *
   * @param activityId - Activity to distribute
   * @param followerIds - User DIDs to receive this activity (deduplicated by caller)
   * @param createdAt - Activity timestamp (denormalized for sorting)
   * @returns Success or error
   *
   * Idempotency guarantee:
   * - Uses ON CONFLICT DO NOTHING on primary key (user_id, activity_id)
   * - Safe to call multiple times with same inputs
   * - Retries are silent (no error on duplicate)
   *
   * Performance:
   * - Bulk insert operation (single query)
   * - Returns immediately if followerIds is empty (no-op)
   */
  fanOutActivityToFollowers(
    activityId: ActivityId,
    followerIds: string[],
    createdAt: Date,
  ): Promise<Result<void>>;

  /**
   * Get a user's following feed (paginated).
   *
   * @param userId - User DID whose feed to fetch
   * @param options - Pagination, filters (urlType, source, beforeActivityId)
   * @returns Paginated feed activities
   *
   * Query pattern:
   * - Filters by user_id on following_feed_items
   * - JOINs to feed_activities for full activity data
   * - Supports same filters as global feed (urlType, source)
   * - Cursor-based pagination via beforeActivityId
   */
  getFollowingFeed(
    userId: string,
    options: FeedQueryOptions,
  ): Promise<Result<PaginatedFeedResult>>;
}
