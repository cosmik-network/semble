import { BaseClient } from './BaseClient';
import {
  GetGemActivityFeedParams,
  GetGlobalFeedParams,
  GetFollowingFeedParams,
  GetGlobalFeedResponse,
} from '@semble/types';

export class FeedClient extends BaseClient {
  async getGlobalFeed(
    params?: GetGlobalFeedParams,
  ): Promise<GetGlobalFeedResponse> {
    const res = await this.client.feeds.globalFeed({
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
    return res.body as GetGlobalFeedResponse;
  }

  async getGemsActivityFeed(
    params?: GetGemActivityFeedParams,
  ): Promise<GetGlobalFeedResponse> {
    const res = await this.client.feeds.gemFeed({
      query: {
        page: params?.page,
        limit: params?.limit,
        urlType: params?.urlType,
        source: params?.source,
        activityTypes: params?.activityTypes,
        includeKnownBots: params?.includeKnownBots,
      },
    });
    return res.body as GetGlobalFeedResponse;
  }

  async getFollowingFeed(
    params?: GetFollowingFeedParams,
  ): Promise<GetGlobalFeedResponse> {
    const res = await this.client.feeds.followingFeed({
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
    return res.body as GetGlobalFeedResponse;
  }
}
