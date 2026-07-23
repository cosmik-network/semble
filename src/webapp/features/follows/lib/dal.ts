import { createSembleClient } from '@/services/client.apiClient';
import { FollowTargetRequest, SubscriptionScope } from '@semble/types';
import { cache } from 'react';

export const followTarget = cache(async (request: FollowTargetRequest) => {
  const client = createSembleClient();
  return client.followTarget(request);
});

export const unfollowTarget = cache(
  async (targetId: string, targetType: 'USER' | 'COLLECTION') => {
    const client = createSembleClient();
    await client.unfollowTarget(targetId, targetType);
  },
);

export const subscribeToTarget = cache(
  async (
    targetId: string,
    targetType: 'USER' | 'COLLECTION',
    scopes?: SubscriptionScope[],
  ) => {
    const client = createSembleClient();
    return client.subscribeToTarget({ targetId, targetType, scopes });
  },
);

export const unsubscribeFromTarget = cache(
  async (targetId: string, targetType: 'USER' | 'COLLECTION') => {
    const client = createSembleClient();
    await client.unsubscribeFromTarget(targetId, targetType);
  },
);

export const updateSubscription = cache(
  async (
    targetId: string,
    targetType: 'USER' | 'COLLECTION',
    scopes: SubscriptionScope[],
  ) => {
    const client = createSembleClient();
    return client.updateSubscription({ targetId, targetType, scopes });
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
