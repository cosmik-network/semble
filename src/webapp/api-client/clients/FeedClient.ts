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
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.beforeActivityId)
      searchParams.set('beforeActivityId', params.beforeActivityId);
    if (params?.urlType) searchParams.set('urlType', params.urlType);
    if (params?.source) searchParams.set('source', params.source);
    if (params?.activityTypes) {
      params.activityTypes.forEach((type) =>
        searchParams.append('activityTypes', type),
      );
    }
    if (params?.includeKnownBots !== undefined)
      searchParams.set('includeKnownBots', params.includeKnownBots.toString());

    const queryString = searchParams.toString();
    const base = routes.feeds.global.path;
    return this.request<GetGlobalFeedResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
  }

  async getGemsActivityFeed(
    params?: GetGemActivityFeedParams,
  ): Promise<GetGlobalFeedResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.urlType) searchParams.set('urlType', params.urlType);
    if (params?.source) searchParams.set('source', params.source);
    if (params?.activityTypes) {
      params.activityTypes.forEach((type) =>
        searchParams.append('activityTypes', type),
      );
    }
    if (params?.includeKnownBots !== undefined)
      searchParams.set('includeKnownBots', params.includeKnownBots.toString());

    const queryString = searchParams.toString();
    const base = routes.feeds.gem.path;
    return this.request<GetGlobalFeedResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
  }

  async getFollowingFeed(
    params?: GetFollowingFeedParams,
  ): Promise<GetGlobalFeedResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.beforeActivityId)
      searchParams.set('beforeActivityId', params.beforeActivityId);
    if (params?.urlType) searchParams.set('urlType', params.urlType);
    if (params?.source) searchParams.set('source', params.source);
    if (params?.activityTypes) {
      params.activityTypes.forEach((type) =>
        searchParams.append('activityTypes', type),
      );
    }
    if (params?.includeKnownBots !== undefined)
      searchParams.set('includeKnownBots', params.includeKnownBots.toString());

    const queryString = searchParams.toString();
    const base = routes.feeds.following.path;
    return this.request<GetGlobalFeedResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
  }
}
