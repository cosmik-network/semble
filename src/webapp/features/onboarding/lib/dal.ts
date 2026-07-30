import { createSembleClient } from '@/services/client.apiClient';

export const getRecommendedUrls = async (queries: string[]) => {
  const client = createSembleClient();
  return client.getRecommendedUrls({ queries });
};

export const getRecommendedUsers = async (urls: string[]) => {
  const client = createSembleClient();
  return client.getRecommendedUsers({ urls });
};

export const getRecommendedCollections = async (urls: string[]) => {
  const client = createSembleClient();
  return client.getRecommendedCollections({ urls });
};
