import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SubscriptionScope } from '@semble/types';
import {
  subscribeToTarget,
  unsubscribeFromTarget,
  updateSubscription,
} from '../dal';
import { followKeys } from '../followKeys';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';

interface SaveSubscriptionPayload {
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
  currentlySubscribed: boolean;
  nextScopes: SubscriptionScope[];
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

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetId,
      targetType,
      currentlySubscribed,
      nextScopes,
    }: SaveSubscriptionPayload) => {
      if (nextScopes.length === 0) {
        if (currentlySubscribed) {
          await unsubscribeFromTarget(targetId, targetType);
        }
        return { isSubscribed: false, scopes: [] as SubscriptionScope[] };
      }

      if (!currentlySubscribed) {
        await subscribeToTarget(targetId, targetType, nextScopes);
      } else {
        await updateSubscription(targetId, targetType, nextScopes);
      }
      return { isSubscribed: true, scopes: nextScopes };
    },
    onSuccess: (_data, vars) => {
      invalidateSubscriptionQueries(queryClient, vars.targetType);
    },
  });
}
