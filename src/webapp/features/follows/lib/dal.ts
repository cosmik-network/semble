import { logoutUser, verifySessionOnClient } from '@/lib/auth/dal';
import { createSembleClient } from '@/services/client.apiClient';
import { FollowTargetRequest } from '@semble/types';
import { cache } from 'react';

export const followTarget = cache(async (request: FollowTargetRequest) => {
  const session = await verifySessionOnClient({ redirectOnFail: true });
  if (!session) throw new Error('No session found');
  const client = createSembleClient();

  try {
    const response = await client.followTarget(request);
    return response;
  } catch (error) {
    await logoutUser();
    throw error;
  }
});

export const unfollowTarget = cache(
  async (targetId: string, targetType: 'USER' | 'COLLECTION') => {
    const session = await verifySessionOnClient({ redirectOnFail: true });
    if (!session) throw new Error('No session found');
    const client = createSembleClient();

    try {
      await client.unfollowTarget(targetId, targetType);
    } catch (error) {
      await logoutUser();
      throw error;
    }
  },
);

export const getFollowingUsers = cache(
  async (identifier: string, params?: { page?: number; limit?: number }) => {
    const client = createSembleClient();
    const response = await client.getFollowingUsers({
      identifier,
      page: params?.page,
      limit: params?.limit,
    });
    return response;
  },
);

export const getFollowers = cache(
  async (identifier: string, params?: { page?: number; limit?: number }) => {
    const client = createSembleClient();
    const response = await client.getFollowers({
      identifier,
      page: params?.page,
      limit: params?.limit,
    });
    return response;
  },
);

export const getFollowingCollections = cache(
  async (identifier: string, params?: { page?: number; limit?: number }) => {
    const client = createSembleClient();
    const response = await client.getFollowingCollections({
      identifier,
      page: params?.page,
      limit: params?.limit,
    });
    return response;
  },
);

export const getCollectionFollowers = cache(
  async (collectionId: string, params?: { page?: number; limit?: number }) => {
    const client = createSembleClient();
    const response = await client.getCollectionFollowers({
      collectionId,
      page: params?.page,
      limit: params?.limit,
    });
    return response;
  },
);

export const getFollowingCount = cache(async (identifier: string) => {
  const client = createSembleClient();
  const response = await client.getFollowingCount({ identifier });
  return response;
});

export const getFollowersCount = cache(async (identifier: string) => {
  const client = createSembleClient();
  const response = await client.getFollowersCount({ identifier });
  return response;
});

export const getFollowingCollectionsCount = cache(
  async (identifier: string) => {
    const client = createSembleClient();
    const response = await client.getFollowingCollectionsCount({ identifier });
    return response;
  },
);

export const getCollectionFollowersCount = cache(
  async (collectionId: string) => {
    const client = createSembleClient();
    const response = await client.getCollectionFollowersCount({ collectionId });
    return response;
  },
);
