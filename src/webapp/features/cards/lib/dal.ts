import { createSembleClient } from '@/services/client.apiClient';
import {
  CardSortField,
  GetUrlMetadataParams,
  SortOrder,
  UrlType,
} from '@semble/types';
import { cache } from 'react';

interface PageParams {
  page?: number;
  limit?: number;
  cardSortBy?: CardSortField;
  cardSortOrder?: SortOrder;
  urlType?: UrlType;
  uncollected?: boolean;
  searchText?: string;
}

export const getUrlMetadata = cache(async (params: GetUrlMetadataParams) => {
  const client = createSembleClient();
  const response = await client.getUrlMetadata(params);

  return response;
});

export const getCardFromMyLibrary = cache(async (url: string) => {
  const client = createSembleClient();
  const response = await client.getUrlStatusForMyLibrary({ url: url });

  return response;
});

export const getMyUrlCards = cache(async (params?: PageParams) => {
  const client = createSembleClient();
  const response = await client.getMyUrlCards({
    page: params?.page,
    limit: params?.limit,
  });

  return response;
});

export const addUrlToLibrary = cache(
  async (
    url: string,
    {
      note,
      collectionIds,
      viaCardId,
    }: { note?: string; collectionIds?: string[]; viaCardId?: string },
  ) => {
    const client = createSembleClient();
    return client.addUrlToLibrary({
      url: url,
      note: note,
      collectionIds: collectionIds,
      viaCardId: viaCardId,
    });
  },
);

export const getUrlCardView = cache(async (id: string) => {
  const client = createSembleClient();
  const response = await client.getUrlCardView(id);

  return response;
});

export const getUrlCards = cache(
  async (didOrHandle: string, params?: PageParams) => {
    const client = createSembleClient();
    const response = await client.getUrlCards({
      identifier: didOrHandle,
      page: params?.page,
      limit: params?.limit,
      sortBy: params?.cardSortBy,
      sortOrder: params?.cardSortOrder,
      urlType: params?.urlType,
      uncollected: params?.uncollected,
      searchText: params?.searchText,
    });

    return response;
  },
);

export const removeCardFromCollection = cache(
  async ({
    cardId,
    collectionIds,
  }: {
    cardId: string;
    collectionIds: string[];
  }) => {
    const client = createSembleClient();
    return client.removeCardFromCollection({
      cardId,
      collectionIds,
    });
  },
);

export const removeCardFromLibrary = cache(async (cardId: string) => {
  const client = createSembleClient();
  return client.removeCardFromLibrary({ cardId });
});

export const getLibrariesForCard = cache(async (cardId: string) => {
  const client = createSembleClient();
  const response = await client.getLibrariesForCard(cardId);

  return response;
});
