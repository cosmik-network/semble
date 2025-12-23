import { verifySessionOnClient } from '@/lib/auth/dal';
import { createSembleClient } from '@/services/apiClient';
import { cache } from 'react';

interface PageParams {
  page?: number;
  limit?: number;
}

export const getNoteCardsForUrl = cache(
  async (url: string, params?: PageParams) => {
    const client = createSembleClient();
    const response = await client.getNoteCardsForUrl({
      url,
      page: params?.page,
      limit: params?.limit,
    });

    return response;
  },
);

export const updateNoteCard = cache(
  async (note: { cardId: string; note: string }) => {
    const session = await verifySessionOnClient({ redirectOnFail: true });
    if (!session) throw new Error('No session found');
    const client = createSembleClient();
    const response = await client.updateNoteCard(note);

    return response;
  },
);
