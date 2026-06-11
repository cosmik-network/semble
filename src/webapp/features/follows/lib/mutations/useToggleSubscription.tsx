import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { subscribeToTarget, unsubscribeFromTarget } from '../dal';
import { followKeys } from '../followKeys';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';

interface ToggleSubscriptionPayload {
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
}

function invalidateSubscriptionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  targetType: 'USER' | 'COLLECTION',
) {
  queryClient.invalidateQueries({ queryKey: followKeys.all() });
  queryClient.invalidateQueries({ queryKey: profileKeys.all() });
  if (targetType === 'COLLECTION') {
    queryClient.invalidateQueries({ queryKey: collectionKeys.all() });
  }
}

export function useToggleSubscription(initialIsSubscribed: boolean) {
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(initialIsSubscribed);
  const [optimistic, setOptimistic] = useState(initialIsSubscribed);

  const mutation = useMutation({
    mutationFn: async ({
      targetId,
      targetType,
      currentlySubscribed,
    }: ToggleSubscriptionPayload & { currentlySubscribed: boolean }) => {
      if (currentlySubscribed) {
        await unsubscribeFromTarget(targetId, targetType);
      } else {
        await subscribeToTarget(targetId, targetType);
      }
      return !currentlySubscribed;
    },
    onSuccess: (next, vars) => {
      setConfirmed(next);
      setOptimistic(next);
      invalidateSubscriptionQueries(queryClient, vars.targetType);
    },
    onError: () => {
      setOptimistic(confirmed);
    },
  });

  const toggleAction = (payload: ToggleSubscriptionPayload) => {
    mutation.mutate({ ...payload, currentlySubscribed: confirmed });
  };

  return {
    isSubscribed: optimistic,
    toggleAction,
    isPending: mutation.isPending,
    setOptimisticIsSubscribed: setOptimistic,
  };
}
