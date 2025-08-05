import { Result } from '../../../shared/core/Result';
import { FeedActivity } from './FeedActivity';
import { ActivityId } from './value-objects/ActivityId';

export interface FeedQueryOptions {
  page: number;
  limit: number;
  beforeActivityId?: ActivityId; // For cursor-based pagination
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
  findById(activityId: ActivityId): Promise<Result<FeedActivity | null>>;
}
