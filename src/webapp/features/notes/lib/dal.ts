import { logoutUser } from '@/lib/auth/dal';
import { createSembleClient } from '@/services/client.apiClient';
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
    const client = createSembleClient();

    try {
      const response = await client.updateNoteCard(note);

      return response;
    } catch (error) {
      await logoutUser();
    }
  },
);
