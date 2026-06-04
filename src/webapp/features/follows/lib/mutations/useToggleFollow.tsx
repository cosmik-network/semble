import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { followTarget, unfollowTarget } from '../dal';
import { followKeys } from '../followKeys';
import { feedKeys } from '@/features/feeds/lib/feedKeys';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import posthog from 'posthog-js';
import { shouldCaptureAnalytics } from '@/features/analytics/utils';

interface ToggleFollowPayload {
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
}

function invalidateFollowQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  targetId: string,
  targetType: 'USER' | 'COLLECTION',
) {
  queryClient.invalidateQueries({ queryKey: followKeys.all() });
  queryClient.invalidateQueries({ queryKey: feedKeys.all() });
  queryClient.invalidateQueries({ queryKey: profileKeys.all() });

  if (targetType === 'USER') {
    queryClient.invalidateQueries({
      queryKey: followKeys.followersCount(targetId),
    });
  } else if (targetType === 'COLLECTION') {
    queryClient.invalidateQueries({
      queryKey: followKeys.collectionFollowersCount(targetId),
    });
    queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
  }
}

export function useToggleFollow(initialIsFollowing: boolean) {
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(initialIsFollowing);
  const [optimistic, setOptimistic] = useState(initialIsFollowing);

  const mutation = useMutation({
    mutationFn: async ({
      targetId,
      targetType,
      currentlyFollowing,
    }: ToggleFollowPayload & { currentlyFollowing: boolean }) => {
      if (currentlyFollowing) {
        await unfollowTarget(targetId, targetType);
      } else {
        await followTarget({ targetId, targetType });
      }
      return !currentlyFollowing;
    },
    onSuccess: (next, vars) => {
      setConfirmed(next);
      setOptimistic(next);
      invalidateFollowQueries(queryClient, vars.targetId, vars.targetType);

      if (next && shouldCaptureAnalytics()) {
        posthog.capture('target_followed', {
          target_type: vars.targetType.toLowerCase(),
        });
      }
    },
    onError: () => {
      setOptimistic(confirmed);
      // 401 → logoutUser is handled by global MutationCache.onError in providers/tanstack.tsx
    },
  });

  const toggleAction = (payload: ToggleFollowPayload) => {
    mutation.mutate({ ...payload, currentlyFollowing: confirmed });
  };

  return {
    isFollowing: optimistic,
    toggleAction,
    isPending: mutation.isPending,
    setOptimisticIsFollowing: setOptimistic,
  };
}
