import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { getServerFeatureFlags } from '@/lib/serverFeatureFlags';
import { makeServerQueryClient } from '@/lib/queryClient';
import { getMyProfile } from '@/features/profile/lib/dal.server';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import {
  ONBOARDING_STATUS_COOKIE,
  parseOnboardingStatus,
} from '@/features/onboarding/lib/onboardingStatus';
import OnboardingFlow from '@/features/onboarding/containers/onboardingFlow/OnboardingFlow';
import Loading from './loading';

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
    await queryClient.prefetchQuery({
      queryKey: profileKeys.mineWithStats(),
      queryFn: () => getMyProfile(true),
    });
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
