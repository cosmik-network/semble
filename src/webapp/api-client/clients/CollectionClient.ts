import { BaseClient } from './BaseClient';
import { unwrap } from '../unwrap';
import {
  CreateCollectionRequest,
  CreateCollectionResponse,
  UpdateCollectionRequest,
  UpdateCollectionResponse,
  DeleteCollectionRequest,
  DeleteCollectionResponse,
  SearchCollectionsParams,
  GetCollectionsResponse,
} from '@semble/types';

export class CollectionClient extends BaseClient {
  async createCollection(
    request: CreateCollectionRequest,
  ): Promise<CreateCollectionResponse> {
    const res = await this.client.collections.createCollection({
      body: request,
    });
    return unwrap<CreateCollectionResponse>(res);
  }

  async updateCollection(
    request: UpdateCollectionRequest,
  ): Promise<UpdateCollectionResponse> {
    const { collectionId, ...updateData } = request;
    const res = await this.client.collections.updateCollection({
      body: { collectionId, ...updateData },
    });
    return unwrap<UpdateCollectionResponse>(res);
  }

  async deleteCollection(
    request: DeleteCollectionRequest,
  ): Promise<DeleteCollectionResponse> {
    const res = await this.client.collections.deleteCollection({
      body: { collectionId: request.collectionId },
    });
    return unwrap<DeleteCollectionResponse>(res);
  }

  async searchCollections(
    params?: SearchCollectionsParams,
  ): Promise<GetCollectionsResponse> {
    const res = await this.client.collections.searchCollections({
      query: {
        page: params?.page,
        limit: params?.limit,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder,
        searchText: params?.searchText,
        identifier: params?.identifier,
        accessType: params?.accessType,
      },
    });
    return unwrap<GetCollectionsResponse>(res);
  }
}
