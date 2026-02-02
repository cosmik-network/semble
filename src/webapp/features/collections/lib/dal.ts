import { logoutUser, verifySessionOnClient } from '@/lib/auth/dal';
import { createSembleClient } from '@/services/client.apiClient';
import {
  CardSortField,
  CollectionAccessType,
  CollectionSortField,
  SortOrder,
  UrlType,
} from '@semble/types';
import { cache } from 'react';

interface PageParams {
  page?: number;
  limit?: number;
  cardSortBy?: CardSortField;
  collectionSortBy?: CollectionSortField;
}

interface SearchParams {
  sortBy?: string;
  sortOrder?: SortOrder;
  searchText?: string;
  urlType?: UrlType;
  handleOrDid?: string;
  accessType?: CollectionAccessType;
  identifier?: string;
}

export const getCollectionsForUrl = cache(
  async (url: string, params?: PageParams) => {
    const client = createSembleClient();
    const response = await client.getCollectionsForUrl({
      url,
      page: params?.page,
      limit: params?.limit,
      sortBy: params?.collectionSortBy,
    });

    return response;
  },
);

export const getCollections = cache(
  async (handleOrDid: string, params?: PageParams & SearchParams) => {
    const client = createSembleClient();
    const response = await client.getCollections({
      identifier: handleOrDid,
      limit: params?.limit,
      page: params?.page,
      sortBy: params?.collectionSortBy,
      searchText: params?.searchText,
    });

    // Temp fix: filter out collections without uri
    return {
      ...response,
      collections: response.collections.filter(
        (collection) => collection.uri !== undefined,
      ),
    };
  },
);

export const getMyCollections = cache(
  async (params?: PageParams & SearchParams) => {
    const session = await verifySessionOnClient({ redirectOnFail: true });
    if (!session) throw new Error('No session found');
    const client = createSembleClient();
    const response = await client.getMyCollections({
      page: params?.page,
      limit: params?.limit,
      sortBy: params?.collectionSortBy,
      sortOrder: params?.sortOrder,
      searchText: params?.searchText,
    });

    // Temp fix: filter out collections without uri
    return {
      ...response,
      collections: response.collections.filter(
        (collection) => collection.uri !== undefined,
      ),
    };
  },
);

export const getMyGemCollections = cache(
  async (params?: PageParams & SearchParams) => {
    const client = createSembleClient();
    const response = await client.getMyCollections({
      page: params?.page,
      limit: params?.limit,
      sortBy: params?.collectionSortBy,
      sortOrder: params?.sortOrder,
      searchText: params?.searchText,
    });

    // Temp fix: filter out collections without uri
    return {
      ...response,
      collections: response.collections.filter(
        (collection) => collection.uri !== undefined,
      ),
    };
  },
);

export const createCollection = cache(
  async (newCollection: {
    name: string;
    description: string;
    accessType: CollectionAccessType;
  }) => {
    const session = await verifySessionOnClient({ redirectOnFail: true });
    if (!session) throw new Error('No session found');
    const client = createSembleClient();

    try {
      const response = await client.createCollection(newCollection);

      return response;
    } catch (error) {
      await logoutUser();
    }
  },
);

export const deleteCollection = cache(async (id: string) => {
  const session = await verifySessionOnClient({ redirectOnFail: true });
  if (!session) throw new Error('No session found');
  const client = createSembleClient();

  try {
    const response = await client.deleteCollection({ collectionId: id });

    return response;
  } catch (error) {
    await logoutUser();
  }
});

export const updateCollection = cache(
  async (collection: {
    collectionId: string;
    rkey: string;
    name: string;
    description?: string;
    accessType?: CollectionAccessType;
  }) => {
    const session = await verifySessionOnClient({ redirectOnFail: true });
    if (!session) throw new Error('No session found');
    const client = createSembleClient();

    try {
      const response = await client.updateCollection(collection);

      return response;
    } catch (error) {
      await logoutUser();
    }
  },
);

export const getCollectionPageByAtUri = cache(
  async ({
    recordKey,
    handle,
    params,
  }: {
    recordKey: string;
    handle: string;
    params?: PageParams & SearchParams;
  }) => {
    const client = createSembleClient();
    const response = await client.getCollectionPageByAtUri({
      recordKey,
      handle,
      page: params?.page,
      limit: params?.limit,
      sortBy: params?.cardSortBy,
      sortOrder: params?.sortOrder,
      urlType: params?.urlType,
    });

    return response;
  },
);

export const searchCollections = cache(
  async (params?: PageParams & SearchParams) => {
    const client = createSembleClient();
    const response = await client.searchCollections({
      page: params?.page,
      limit: params?.limit,
      sortBy: params?.collectionSortBy,
      sortOrder: params?.sortOrder,
      searchText: params?.searchText,
      accessType: params?.accessType,
      identifier: params?.identifier,
    });

    // Temp fix: filter out collections without uri
    return {
      ...response,
      collections: response.collections.filter(
        (collection) => collection.uri !== undefined,
      ),
    };
  },
);

export const getOpenCollectionsWithContributor = cache(
  async (params?: PageParams & { identifier: string }) => {
    const client = createSembleClient();
    const response = await client.getOpenCollectionsWithContributor({
      identifier: params?.identifier || '',
      page: params?.page,
      limit: params?.limit,
      sortBy: params?.collectionSortBy,
    });

    // temp fix: filter out collections without uri
    return {
      ...response,
      collections: response.collections.filter((c) => !!c.uri),
    };
  },
);
