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
} from '@semble/types';

export class CollectionClient extends BaseClient {
  async createCollection(
    request: CreateCollectionRequest,
  ): Promise<CreateCollectionResponse> {
    return this.request<CreateCollectionResponse>(
      'POST',
      '/api/collections',
      request,
    );
  }

  async updateCollection(
    request: UpdateCollectionRequest,
  ): Promise<UpdateCollectionResponse> {
    const { collectionId, ...updateData } = request;
    return this.request<UpdateCollectionResponse>(
      'PUT',
      `/api/collections/${collectionId}`,
      updateData,
    );
  }

  async deleteCollection(
    request: DeleteCollectionRequest,
  ): Promise<DeleteCollectionResponse> {
    return this.request<DeleteCollectionResponse>(
      'DELETE',
      `/api/collections/${request.collectionId}`,
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

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/collections/search?${queryString}`
      : '/api/collections/search';

    return this.request<GetCollectionsResponse>('GET', endpoint);
  }
}
