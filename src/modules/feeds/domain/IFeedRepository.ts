import { CollectionId } from 'src/modules/cards/domain/value-objects/CollectionId';
import { Result } from '../../../shared/core/Result';
import { FeedActivity } from './FeedActivity';
import { ActivityId } from './value-objects/ActivityId';
import { UrlType } from '../../cards/domain/value-objects/UrlType';

export interface FeedQueryOptions {
  page: number;
  limit: number;
  beforeActivityId?: ActivityId; // For cursor-based pagination
  urlType?: UrlType; // Filter by URL type
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
}
