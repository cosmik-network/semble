import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { makeServerQueryClient } from '@/lib/queryClient';
import { getMyProfile } from '@/features/profile/lib/dal.server';
import { profileKeys } from '@/features/profile/lib/profileKeys';
import { getMyCollections } from '@/features/collections/lib/dal.server';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { COMPOSER_COLLECTIONS_LIMIT } from '@/features/collections/lib/constants';
import { getOnboardingState } from '@/features/onboarding/lib/dal.server';
import { onboardingKeys } from '@/features/onboarding/lib/onboardingKeys';
import OnboardingFlow from '@/features/onboarding/containers/onboardingFlow/OnboardingFlow';
import OnboardingScreenSkeleton from '@/features/onboarding/components/onboardingScreen/Skeleton.OnboardingScreen';
import WelcomeViewSkeleton from '@/features/onboarding/components/welcomeView/Skeleton.WelcomeView';

interface Props {
  searchParams: Promise<{ step?: string }>;
}

export default async function Page(props: Props) {
  await verifySessionOnServer({ redirectOnFail: true });
  const { step } = await props.searchParams;

  const queryClient = makeServerQueryClient();

  // Awaited (in parallel) rather than streamed as pending promises: a
  // rejected un-awaited prefetch is serialized into the RSC payload and
  // surfaces as an unhandled Server Components render error (the bare "This
  // page couldn't load" screen). prefetch* never rejects, so awaiting leaves
  // a failed query un-dehydrated and the client refetches it. See
  // .agent/logs/20260917_nextjs_ssr_issue.md.
  //
  // The collections seed exists because the last stage renders Composer,
  // which calls useMyCollections — a suspense query — at the top of its
  // body, so it suspends whether or not its drawer is open. This route sits
  // outside (dashboard) and does not inherit that layout's identical
  // prefetch.
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: onboardingKeys.state(),
      queryFn: getOnboardingState,
    }),

    queryClient.prefetchQuery({
      queryKey: profileKeys.mineWithStats(),
      queryFn: () => getMyProfile(true),
    }),

    queryClient.prefetchInfiniteQuery({
      queryKey: collectionKeys.mine(COMPOSER_COLLECTIONS_LIMIT, undefined),
      initialPageParam: 1,
      queryFn: () =>
        getMyCollections({ page: 1, limit: COMPOSER_COLLECTIONS_LIMIT }),
    }),
  ]);

  // Awaited because the skeleton depends on it; shares the cache()d call above.
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
