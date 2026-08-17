import type { UpdateOnboardingStateRequest } from '@semble/types';
import { createSembleClient } from '@/services/client.apiClient';

export const getRecommendedUrls = async (
  queries: string[],
  params?: { page?: number; limit?: number },
) => {
  const client = createSembleClient();
  return client.getRecommendedUrls({
    queries,
    page: params?.page,
    limit: params?.limit,
  });
};

export const getRecommendedUsers = async (urls: string[]) => {
  const client = createSembleClient();
  return client.getRecommendedUsers({ urls });
};

export const getRecommendedCollections = async (urls: string[]) => {
  const client = createSembleClient();
  return client.getRecommendedCollections({ urls });
};

export const getOnboardingState = async () => {
  const client = createSembleClient();
  return client.getOnboardingState();
};

export const updateOnboardingState = async (
  update: UpdateOnboardingStateRequest,
) => {
  const client = createSembleClient();
  return client.updateOnboardingState(update);
};
