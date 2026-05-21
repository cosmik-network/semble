import { BaseClient } from './BaseClient';
import {
  GetGemActivityFeedParams,
  GetGlobalFeedParams,
  GetFollowingFeedParams,
  GetGlobalFeedResponse,
  routes,
} from '@semble/types';

export class FeedClient extends BaseClient {
  async getGlobalFeed(
    params?: GetGlobalFeedParams,
  ): Promise<GetGlobalFeedResponse> {
    return this.request<GetGlobalFeedResponse>(routes.feeds.global, {
      query: {
        page: params?.page,
        limit: params?.limit,
        beforeActivityId: params?.beforeActivityId,
        urlType: params?.urlType,
        source: params?.source,
        activityTypes: params?.activityTypes,
        includeKnownBots: params?.includeKnownBots,
      },
    });
  }

  async getGemsActivityFeed(
    params?: GetGemActivityFeedParams,
  ): Promise<GetGlobalFeedResponse> {
    return this.request<GetGlobalFeedResponse>(routes.feeds.gem, {
      query: {
        page: params?.page,
        limit: params?.limit,
        urlType: params?.urlType,
        source: params?.source,
        activityTypes: params?.activityTypes,
        includeKnownBots: params?.includeKnownBots,
      },
    });
  }

  async getFollowingFeed(
    params?: GetFollowingFeedParams,
  ): Promise<GetGlobalFeedResponse> {
    return this.request<GetGlobalFeedResponse>(routes.feeds.following, {
      query: {
        page: params?.page,
        limit: params?.limit,
        beforeActivityId: params?.beforeActivityId,
        urlType: params?.urlType,
        source: params?.source,
        activityTypes: params?.activityTypes,
        includeKnownBots: params?.includeKnownBots,
      },
    });
  }
}
