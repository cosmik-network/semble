import { BaseClient } from './BaseClient';
import { unwrap } from '../unwrap';
import {
  GetTagsParams,
  GetTagsResponse,
  GetTaggedItemsParams,
  GetTaggedItemsResponse,
} from '@semble/types';

export class TagClient extends BaseClient {
  async getTags(params?: GetTagsParams): Promise<GetTagsResponse> {
    const res = await this.client.tags.getTags({
      query: {
        q: params?.q,
        limit: params?.limit,
      },
    });
    return unwrap<GetTagsResponse>(res);
  }

  async getTaggedItems(
    params: GetTaggedItemsParams,
  ): Promise<GetTaggedItemsResponse> {
    const res = await this.client.tags.taggedItems({
      query: {
        tag: params.tag,
        itemType: params.itemType,
        user: params.user,
        page: params.page,
        limit: params.limit,
      },
    });
    return unwrap<GetTaggedItemsResponse>(res);
  }
}
