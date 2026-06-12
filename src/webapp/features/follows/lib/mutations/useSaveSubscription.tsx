import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { BsExclamation } from 'react-icons/bs';
import { SubscriptionScope } from '@semble/types';
import posthog from 'posthog-js';
import { shouldCaptureAnalytics } from '@/features/analytics/utils';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import {
  subscribeToTarget,
  unsubscribeFromTarget,
  updateSubscription,
} from '../dal';
import { followKeys } from '../followKeys';
import { FollowTarget, SubscriptionState } from '../types';

interface SaveSubscriptionPayload {
  desiredScopes: SubscriptionScope[];
  wasSubscribed: boolean;
}

export function useSaveSubscription(target: FollowTarget) {
  const queryClient = useQueryClient();

  const subscriptionStateKey = followKeys.subscriptionState(
    target.targetType,
    target.targetId,
  );
  const mutationKey = [...subscriptionStateKey, 'save'];

  // With rapid saves, only the last in-flight mutation may roll back
  // state or trigger invalidation — earlier ones have been superseded.
  const isLastMutation = () => queryClient.isMutating({ mutationKey }) === 1;

  const mutation = useMutation({
    mutationKey,
    mutationFn: async ({
      desiredScopes,
      wasSubscribed,
    }: SaveSubscriptionPayload) => {
      if (desiredScopes.length === 0) {
        await unsubscribeFromTarget(target.targetId, target.targetType);
      } else if (wasSubscribed) {
        await updateSubscription(
          target.targetId,
          target.targetType,
          desiredScopes,
        );
      } else {
        await subscribeToTarget(
          target.targetId,
          target.targetType,
          desiredScopes,
        );
      }
    },
    onMutate: ({ desiredScopes }) => {
      const previousSubscription =
        queryClient.getQueryData<SubscriptionState>(subscriptionStateKey);

      queryClient.setQueryData<SubscriptionState>(subscriptionStateKey, {
        isSubscribed: desiredScopes.length > 0,
        scopes: desiredScopes,
      });

      return { previousSubscription };
    },
    onError: (_error, _payload, context) => {
      if (isLastMutation()) {
        queryClient.setQueryData(
          subscriptionStateKey,
          context?.previousSubscription,
        );
      }
      notifications.show({
        message: 'Could not update notification settings',
        position: 'top-center',
        color: 'red',
        title: 'Error',
        icon: <BsExclamation />,
      });
      // 401 → logoutUser is handled by global MutationCache.onError in providers/tanstack.tsx
    },
    onSuccess: (_data, { desiredScopes, wasSubscribed }) => {
      if (!wasSubscribed && desiredScopes.length > 0 && shouldCaptureAnalytics()) {
        posthog.capture('target_subscribed', {
          target_type: target.targetType.toLowerCase(),
        });
      }
    },
    onSettled: () => {
      if (!isLastMutation()) return;

      // keep server-sourced copies of isSubscribed/subscriptionScopes fresh
      queryClient.invalidateQueries({ queryKey: profileKeys.all() });
      if (target.targetType === 'COLLECTION') {
        queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
      }
    },
  });

  const saveSubscription = (desiredScopes: SubscriptionScope[]) => {
    const current =
      queryClient.getQueryData<SubscriptionState>(subscriptionStateKey);
    mutation.mutate({
      desiredScopes,
      wasSubscribed: current?.isSubscribed ?? false,
    });
  };

  return { saveSubscription, isPending: mutation.isPending };
}
