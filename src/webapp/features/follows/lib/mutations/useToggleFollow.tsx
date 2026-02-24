import { useActionState, useOptimistic } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { followTarget, unfollowTarget } from '../dal';
import { followKeys } from '../followKeys';
import { feedKeys } from '@/features/feeds/lib/feedKeys';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { profileKeys } from '@/features/profile/lib/profileKeys';

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

  const [isFollowing, toggleAction, isPending] = useActionState(
    async (
      currentIsFollowing: boolean,
      { targetId, targetType }: ToggleFollowPayload,
    ) => {
      const intended = currentIsFollowing ? 'unfollow' : 'follow';
      try {
        if (currentIsFollowing) {
          await unfollowTarget(targetId, targetType);
        } else {
          await followTarget({ targetId, targetType });
        }
        invalidateFollowQueries(queryClient, targetId, targetType);
        const final = currentIsFollowing ? 'unfollowed' : 'followed';
        console.log(
          `[toggleFollow] intended: ${intended} | result: ${final} | match: ✅`,
        );
        return !currentIsFollowing;
      } catch {
        const final = currentIsFollowing ? 'followed' : 'unfollowed';
        console.log(
          `[toggleFollow] intended: ${intended} | result: ${final} (reverted) | match: ❌`,
        );
        return currentIsFollowing;
      }
    },
    initialIsFollowing,
  );

  // useOptimistic gives immediate UI feedback during the transition.
  // While isPending, optimisticIsFollowing flips instantly on click.
  // When the action settles, it reverts to the confirmed isFollowing value.
  const [optimisticIsFollowing, setOptimisticIsFollowing] =
    useOptimistic(isFollowing);

  return {
    isFollowing: optimisticIsFollowing,
    toggleAction,
    isPending,
    setOptimisticIsFollowing,
  };
}
