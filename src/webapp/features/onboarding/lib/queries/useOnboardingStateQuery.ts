'use client';

import { useQuery } from '@tanstack/react-query';
import { getOnboardingState } from '../dal';
import { onboardingKeys } from '../onboardingKeys';

/**
 * useQuery, not useSuspenseQuery: a failed read must render the flow against an
 * empty record rather than throw into the route's error boundary. Both entry
 * points seed this key from the server.
 */
export default function useOnboardingStateQuery() {
  return useQuery({
    queryKey: onboardingKeys.state(),
    queryFn: getOnboardingState,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
