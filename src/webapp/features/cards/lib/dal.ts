import { verifySessionOnClient } from '@/lib/auth/dal';
import { createSembleClient } from '@/services/client.apiClient';
import { CardSortField, SortOrder, UrlType } from '@semble/types';
import { cache } from 'react';

interface PageParams {
  page?: number;
  limit?: number;
  cardSortBy?: CardSortField;
  cardSortOrder?: SortOrder;
  urlType?: UrlType;
}

export const getUrlMetadata = cache(async (url: string) => {
  const client = createSembleClient();
  const response = await client.getUrlMetadata(url);

  return response;
});

export const getCardFromMyLibrary = cache(async (url: string) => {
  const session = await verifySessionOnClient({ redirectOnFail: true });
  if (!session) throw new Error('No session found');
  const client = createSembleClient();
  const response = await client.getUrlStatusForMyLibrary({ url: url });

  return response;
});

export const getMyUrlCards = cache(async (params?: PageParams) => {
  const session = await verifySessionOnClient({ redirectOnFail: true });
  if (!session) throw new Error('No session found');
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
    const session = await verifySessionOnClient({ redirectOnFail: true });
    if (!session) throw new Error('No session found');
    const client = createSembleClient();
    const response = await client.addUrlToLibrary({
      url: url,
      note: note,
      collectionIds: collectionIds,
      viaCardId: viaCardId,
    });

    return response;
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
    const session = await verifySessionOnClient({ redirectOnFail: true });
    if (!session) throw new Error('No session found');
    const client = createSembleClient();
    const response = await client.removeCardFromCollection({
      cardId,
      collectionIds,
    });

    return response;
  },
);

export const removeCardFromLibrary = cache(async (cardId: string) => {
  const session = await verifySessionOnClient({ redirectOnFail: true });
  if (!session) throw new Error('No session found');
  const client = createSembleClient();
  const response = await client.removeCardFromLibrary({ cardId });

  return response;
});

export const getLibrariesForCard = cache(async (cardId: string) => {
  const session = await verifySessionOnClient({ redirectOnFail: true });
  if (!session) throw new Error('No session found');
  const client = createSembleClient();
  const response = await client.getLibrariesForCard(cardId);

  return response;
});
