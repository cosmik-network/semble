import HomeContainer from '@/features/home/containers/homeContainer/HomeContainer';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { getMyCollections } from '@/features/collections/lib/dal.server';
import { getMyUrlCards } from '@/features/cards/lib/dal.server';
import { collectionKeys } from '@/features/collections/lib/collectionKeys';
import { cardKeys } from '@/features/cards/lib/cardKeys';
import { makeServerQueryClient } from '@/lib/queryClient';
import { cookies } from 'next/headers';
import { getServerFeatureFlags } from '@/lib/serverFeatureFlags';
import {
  ONBOARDING_STATUS_COOKIE,
  parseOnboardingStatus,
} from '@/features/onboarding/lib/onboardingStatus';
import HomeOnboardingBanner from '@/features/onboarding/components/homeOnboardingBanner/HomeOnboardingBanner';

// Each entry must match the limit its component passes, or the prefetch lands
// under a different query key and the client refetches:
//   RecentCollections -> useMyCollections({ limit: 3 })
//   RecentCards       -> useMyCards({ limit: 4 })
//   DiscoverOnSemble  -> useMyCards({ limit: 8 })
const RECENT_COLLECTIONS_LIMIT = 3;
const RECENT_CARDS_LIMIT = 4;
const DISCOVER_CARDS_LIMIT = 8;

export default async function Page() {
  await verifySessionOnServer({ redirectOnFail: true });

  const featureFlags = await getServerFeatureFlags();
  const cookieStore = await cookies();
  const onboardingStatus = parseOnboardingStatus(
    cookieStore.get(ONBOARDING_STATUS_COOKIE)?.value,
  );

  // Without the flag check the banner would link non-team users to
  // /onboarding, which redirects straight back here — a button that appears
  // to do nothing.
  const showBanner =
    featureFlags.onboarding &&
    (onboardingStatus === 'unseen' || onboardingStatus === 'in_progress');

  // HomeContainer's children run useMyCollections/useMyCards — suspense queries
  // over DALs that authenticate through the browser and cannot run during SSR.
  // Fetch them here with the server DALs and hand them down.
  const queryClient = makeServerQueryClient();

  await Promise.all([
    queryClient.prefetchInfiniteQuery({
      queryKey: collectionKeys.mine(RECENT_COLLECTIONS_LIMIT, undefined),
      initialPageParam: 1,
      queryFn: () =>
        getMyCollections({ page: 1, limit: RECENT_COLLECTIONS_LIMIT }),
    }),
    queryClient.prefetchInfiniteQuery({
      queryKey: cardKeys.mine(RECENT_CARDS_LIMIT),
      initialPageParam: 1,
      queryFn: () => getMyUrlCards({ page: 1, limit: RECENT_CARDS_LIMIT }),
    }),
    queryClient.prefetchInfiniteQuery({
      queryKey: cardKeys.mine(DISCOVER_CARDS_LIMIT),
      initialPageParam: 1,
      queryFn: () => getMyUrlCards({ page: 1, limit: DISCOVER_CARDS_LIMIT }),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeContainer
        onboardingBanner={
          showBanner ? (
            <HomeOnboardingBanner initialStatus={onboardingStatus} />
          ) : undefined
        }
      />
    </HydrationBoundary>
  );
}
