import { useQuery } from '@tanstack/react-query';
import { getMyProfile } from '../dal';
import { profileKeys } from '../profileKeys';

/**
 * Account stats for onboarding's "what next" tiles.
 *
 * useQuery, not useSuspenseQuery: the failure path has to render — stage 4
 * fails open and unlocks every tile — rather than propagate to a boundary.
 */
export default function useMyProfileStats() {
  return useQuery({
    queryKey: profileKeys.mineWithStats(),
    queryFn: () => getMyProfile(true),
  });
}
