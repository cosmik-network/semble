import { cookies } from 'next/headers';
import { getServerFeatureFlags } from '@/lib/serverFeatureFlags';
import {
  ONBOARDING_STATUS_COOKIE,
  parseOnboardingStatus,
} from '../../lib/onboardingStatus';
import HomeOnboardingBannerCard from './HomeOnboardingBannerCard';

/**
 * Server-side gate: decides whether the banner should show at all, then hands
 * off to HomeOnboardingBannerCard for the actual UI. Kept async and separate
 * from the card so HomeContainer can mount it under its own `<Suspense>` —
 * getServerFeatureFlags round-trips to the auth API, and HomeContainer's
 * other sections (DiscoverOnSemble, RecentCollections, RecentCards) each have
 * their own Suspense boundary and must not wait on this one. If this async
 * work lived directly in HomeContainer, HomeContainer itself would have to
 * become async, and React can't start rendering any of its returned JSX —
 * including those sibling Suspense boundaries — until an async component's
 * own awaits resolve.
 */
export default async function HomeOnboardingBanner() {
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

  if (!showBanner) return null;

  return <HomeOnboardingBannerCard initialStatus={onboardingStatus} />;
}
