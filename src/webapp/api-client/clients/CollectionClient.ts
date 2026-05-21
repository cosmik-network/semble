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
      'POST',
      routes.collections.createCollection.path,
      request,
    );
  }

  async updateCollection(
    request: UpdateCollectionRequest,
  ): Promise<UpdateCollectionResponse> {
    const { collectionId, ...updateData } = request;
    return this.request<UpdateCollectionResponse>(
      'PUT',
      routes.collections.updateCollection.build({ collectionId }),
      updateData,
    );
  }

  async deleteCollection(
    request: DeleteCollectionRequest,
  ): Promise<DeleteCollectionResponse> {
    return this.request<DeleteCollectionResponse>(
      'DELETE',
      routes.collections.deleteCollection.build({
        collectionId: request.collectionId,
      }),
    );
  }

  async searchCollections(
    params?: SearchCollectionsParams,
  ): Promise<GetCollectionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.searchText) searchParams.set('searchText', params.searchText);
    if (params?.identifier) searchParams.set('identifier', params.identifier);
    if (params?.accessType) searchParams.set('accessType', params.accessType);

    const queryString = searchParams.toString();
    const base = routes.collections.searchCollections.path;
    return this.request<GetCollectionsResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
  }
}
