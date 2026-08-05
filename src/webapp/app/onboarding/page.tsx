import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { getServerFeatureFlags } from '@/lib/serverFeatureFlags';
import { makeServerQueryClient } from '@/lib/queryClient';
import { getMyProfile } from '@/features/profile/lib/dal.server';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import { getMyCollections } from '@/features/collections/lib/dal.server';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import {
  ONBOARDING_STATUS_COOKIE,
  parseOnboardingStatus,
} from '@/features/onboarding/lib/onboardingStatus';
import OnboardingFlow from '@/features/onboarding/containers/onboardingFlow/OnboardingFlow';
import Loading from './loading';

// Must match useMyCollections({ limit: NAV_COLLECTIONS_LIMIT }) in Composer,
// or the prefetch lands under a different key and the client refetches. Same
// constant and same value as app/(dashboard)/layout.tsx.
const NAV_COLLECTIONS_LIMIT = 30;

export default async function Page() {
  await verifySessionOnServer({ redirectOnFail: true });

  const featureFlags = await getServerFeatureFlags();
  if (!featureFlags.onboarding) {
    redirect('/home');
  }

  const cookieStore = await cookies();
  const initialStatus = parseOnboardingStatus(
    cookieStore.get(ONBOARDING_STATUS_COOKIE)?.value,
  );

  const queryClient = makeServerQueryClient();

  try {
    // Concurrent, like (dashboard)/home/page.tsx: they're independent, and
    // neither prefetch* rejects, so one failing cannot skip the other.
    await Promise.all([
      // Stage 4's tiles read the stats query.
      queryClient.prefetchQuery({
        queryKey: profileKeys.mineWithStats(),
        queryFn: () => getMyProfile(true),
      }),

      // Stage 4 renders Composer, which calls useMyCollections — a suspense
      // query — at the top of its body rather than inside its Drawer, so it
      // suspends whether or not the drawer is open. This route sits outside
      // (dashboard), so it does not inherit that layout's identical prefetch,
      // and without this every hard load of /onboarding suspends the entire
      // page behind loading.tsx. Client-fetching is not a fallback here: the
      // client DAL calls verifySessionOnClient(), which returns null off the
      // browser, and throws.
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

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {/* OnboardingFlow calls useSearchParams(); without this boundary Next
          opts the route into client rendering and warns at build time. */}
      <Suspense fallback={<Loading />}>
        <OnboardingFlow initialStatus={initialStatus} />
      </Suspense>
    </HydrationBoundary>
  );
}
