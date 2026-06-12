import { skipToken, useQuery } from '@tanstack/react-query';
import { SubscriptionScope } from '@semble/types';
import { followKeys } from '../followKeys';
import { FollowTarget, SubscriptionState } from '../types';

const NOT_SUBSCRIBED: SubscriptionState = { isSubscribed: false, scopes: [] };

/**
 * Subscription state for a target, shared across every component that
 * renders it. Seeded from server-rendered props and only written by
 * mutations — see useFollowState for the rationale behind `skipToken`.
 */
export function useSubscriptionState(
  target: FollowTarget,
  initial?: { isSubscribed?: boolean; scopes?: SubscriptionScope[] },
) {
  const { data: subscription } = useQuery<SubscriptionState>({
    queryKey: followKeys.subscriptionState(target.targetType, target.targetId),
    queryFn: skipToken,
    initialData: {
      isSubscribed: initial?.isSubscribed ?? false,
      scopes: initial?.scopes ?? [],
    },
    staleTime: Infinity,
  });

  // skipToken widens `data` to `T | undefined` even with initialData
  return subscription ?? NOT_SUBSCRIBED;
}
