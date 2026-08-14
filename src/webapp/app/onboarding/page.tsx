import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { makeServerQueryClient } from '@/lib/queryClient';
import { getMyProfile } from '@/features/profile/lib/dal.server';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import { getMyCollections } from '@/features/collections/lib/dal.server';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { getOnboardingState } from '@/features/onboarding/lib/dal.server';
import { onboardingKeys } from '@/features/onboarding/lib/onboardingKeys';
import OnboardingFlow from '@/features/onboarding/containers/onboardingFlow/OnboardingFlow';
import OnboardingScreenSkeleton from '@/features/onboarding/components/onboardingScreen/Skeleton.OnboardingScreen';
import WelcomeViewSkeleton from '@/features/onboarding/components/welcomeView/Skeleton.WelcomeView';

// Must match useMyCollections({ limit: NAV_COLLECTIONS_LIMIT }) in Composer,
// or the prefetch lands under a different key and the client refetches.
const NAV_COLLECTIONS_LIMIT = 30;

interface Props {
  searchParams: Promise<{ step?: string }>;
}

export default async function Page(props: Props) {
  await verifySessionOnServer({ redirectOnFail: true });

  const queryClient = makeServerQueryClient();

  try {
    await Promise.all([
      // Seeds the record the flow reads, so the first client render already
      // knows which screen to show — no flash, and no hydration flag.
      queryClient.prefetchQuery({
        queryKey: onboardingKeys.state(),
        queryFn: getOnboardingState,
      }),

      queryClient.prefetchQuery({
        queryKey: profileKeys.mineWithStats(),
        queryFn: () => getMyProfile(true),
      }),

      // The last stage renders Composer, which calls useMyCollections — a
      // suspense query — at the top of its body, so it suspends whether or not
      // its drawer is open. This route sits outside (dashboard) and does not
      // inherit that layout's identical prefetch.
      queryClient.prefetchInfiniteQuery({
        queryKey: collectionKeys.mine(NAV_COLLECTIONS_LIMIT, undefined),
        initialPageParam: 1,
        queryFn: () =>
          getMyCollections({ page: 1, limit: NAV_COLLECTIONS_LIMIT }),
      }),
    ]);
  } catch {
    // Fall through to client fetching rather than failing the whole route,
    // matching app/(dashboard)/layout.tsx.
  }

  // Which screen OnboardingFlow will settle on, from the same two inputs it
  // uses. The record is already resolved and cache()d by the prefetch above.
  const { step } = await props.searchParams;
  const status = await getOnboardingState()
    .then((state) => state.onboardingState ?? 'NOT_STARTED')
    .catch(() => 'NOT_STARTED' as const);

  const fallback =
    step !== undefined ? (
      <OnboardingScreenSkeleton />
    ) : status === 'COMPLETED' || status === 'SKIPPED' ? (
      <OnboardingScreenSkeleton variant="returning" />
    ) : (
      <WelcomeViewSkeleton />
    );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {/* OnboardingFlow calls useSearchParams(); without this boundary Next
          opts the route into client rendering and warns at build time. */}
      <Suspense fallback={fallback}>
        <OnboardingFlow />
      </Suspense>
    </HydrationBoundary>
  );
}
