import { skipToken, useQuery } from '@tanstack/react-query';
import { followKeys } from '../followKeys';
import { FollowTarget } from '../types';

/**
 * Follow state for a target, shared across every component that renders it.
 *
 * There is no GET endpoint for this state: the entry is seeded from
 * server-rendered props (`initialIsFollowing`) and only ever written by
 * mutations. `skipToken` makes the query unfetchable, so broad
 * invalidations are harmless no-ops.
 */
export function useFollowState(
  target: FollowTarget,
  initialIsFollowing?: boolean,
) {
  const { data: isFollowing } = useQuery({
    queryKey: followKeys.followState(target.targetType, target.targetId),
    queryFn: skipToken,
    initialData: initialIsFollowing ?? false,
    staleTime: Infinity,
  });

  // skipToken widens `data` to `T | undefined` even with initialData
  return { isFollowing: isFollowing ?? false };
}
