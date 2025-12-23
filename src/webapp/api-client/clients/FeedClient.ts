import { BaseClient } from './BaseClient';
import {
  GetGemActivityFeedParams,
  GetGlobalFeedParams,
  GetGlobalFeedResponse,
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

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/feeds/global?${queryString}`
      : '/api/feeds/global';

    return this.request<GetGlobalFeedResponse>('GET', endpoint);
  }

  async getGemsActivityFeed(
    params?: GetGemActivityFeedParams,
  ): Promise<GetGlobalFeedResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.urlType) searchParams.set('urlType', params.urlType);

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/feeds/gem?${queryString}`
      : '/api/feeds/gem';

    return this.request<GetGlobalFeedResponse>('GET', endpoint);
  }
}
