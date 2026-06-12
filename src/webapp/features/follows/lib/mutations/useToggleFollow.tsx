import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { BsExclamation } from 'react-icons/bs';
import posthog from 'posthog-js';
import { shouldCaptureAnalytics } from '@/features/analytics/utils';
import { feedKeys } from '@/features/feeds/lib/feedKeys';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import { followTarget, unfollowTarget } from '../dal';
import { followKeys } from '../followKeys';
import { FollowTarget, SubscriptionState } from '../types';

export function useToggleFollow(target: FollowTarget) {
  const queryClient = useQueryClient();

  const followStateKey = followKeys.followState(
    target.targetType,
    target.targetId,
  );
  const subscriptionStateKey = followKeys.subscriptionState(
    target.targetType,
    target.targetId,
  );
  const mutationKey = [...followStateKey, 'toggle'];

  // With rapid toggling, only the last in-flight mutation may roll back
  // state or trigger invalidation — earlier ones have been superseded.
  const isLastMutation = () => queryClient.isMutating({ mutationKey }) === 1;

  const mutation = useMutation({
    mutationKey,
    mutationFn: async (next: boolean) => {
      if (next) {
        await followTarget({
          targetId: target.targetId,
          targetType: target.targetType,
        });
      } else {
        await unfollowTarget(target.targetId, target.targetType);
      }
    },
    onMutate: (next) => {
      const previousFollow = queryClient.getQueryData<boolean>(followStateKey);
      const previousSubscription =
        queryClient.getQueryData<SubscriptionState>(subscriptionStateKey);

      queryClient.setQueryData(followStateKey, next);
      if (!next) {
        // unfollowing also deletes the subscription server-side
        queryClient.setQueryData<SubscriptionState>(subscriptionStateKey, {
          isSubscribed: false,
          scopes: [],
        });
      }

      return { previousFollow, previousSubscription };
    },
    onError: (_error, _next, context) => {
      if (isLastMutation()) {
        queryClient.setQueryData(followStateKey, context?.previousFollow);
        queryClient.setQueryData(
          subscriptionStateKey,
          context?.previousSubscription,
        );
      }
      notifications.show({
        message: 'Could not update follow',
        position: 'top-center',
        color: 'red',
        title: 'Error',
        icon: <BsExclamation />,
      });
      // 401 → logoutUser is handled by global MutationCache.onError in providers/tanstack.tsx
    },
    onSuccess: (_data, next) => {
      if (next && shouldCaptureAnalytics()) {
        posthog.capture('target_followed', {
          target_type: target.targetType.toLowerCase(),
        });
      }
    },
    onSettled: () => {
      if (!isLastMutation()) return;

      queryClient.invalidateQueries({ queryKey: followKeys.all() });
      queryClient.invalidateQueries({ queryKey: feedKeys.all() });
      queryClient.invalidateQueries({ queryKey: profileKeys.all() });

      if (target.targetType === 'USER') {
        queryClient.invalidateQueries({
          queryKey: followKeys.followersCount(target.targetId),
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: followKeys.collectionFollowersCount(target.targetId),
        });
        queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
      }
    },
  });

  const toggleFollow = () => {
    const isFollowing =
      queryClient.getQueryData<boolean>(followStateKey) ?? false;
    mutation.mutate(!isFollowing);
  };

  return { toggleFollow, isPending: mutation.isPending };
}
