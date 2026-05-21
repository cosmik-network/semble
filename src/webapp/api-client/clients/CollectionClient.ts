import { BaseClient } from './BaseClient';
import {
  CreateCollectionRequest,
  CreateCollectionResponse,
  UpdateCollectionRequest,
  UpdateCollectionResponse,
  DeleteCollectionRequest,
  DeleteCollectionResponse,
  SearchCollectionsParams,
  GetCollectionsResponse,
  routes,
} from '@semble/types';

export class CollectionClient extends BaseClient {
  async createCollection(
    request: CreateCollectionRequest,
  ): Promise<CreateCollectionResponse> {
    return this.request<CreateCollectionResponse>(
      routes.collections.createCollection,
      { body: request },
    );
  }

  async updateCollection(
    request: UpdateCollectionRequest,
  ): Promise<UpdateCollectionResponse> {
    const { collectionId, ...updateData } = request;
    return this.request<UpdateCollectionResponse>(
      routes.collections.updateCollection,
      { body: { collectionId, ...updateData } },
    );
  }

  async deleteCollection(
    request: DeleteCollectionRequest,
  ): Promise<DeleteCollectionResponse> {
    return this.request<DeleteCollectionResponse>(
      routes.collections.deleteCollection,
      { query: { collectionId: request.collectionId } },
    );
  }

  async searchCollections(
    params?: SearchCollectionsParams,
  ): Promise<GetCollectionsResponse> {
    return this.request<GetCollectionsResponse>(
      routes.collections.searchCollections,
      {
        query: {
          page: params?.page,
          limit: params?.limit,
          sortBy: params?.sortBy,
          sortOrder: params?.sortOrder,
          searchText: params?.searchText,
          identifier: params?.identifier,
          accessType: params?.accessType,
        },
      },
    );
  }
}
