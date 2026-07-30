import { redirect } from 'next/navigation';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { getServerFeatureFlags } from '@/lib/serverFeatureFlags';
import OnboardingContainer from '@/features/onboarding/containers/onboardingContainer/OnboardingContainer';

export default async function Page() {
  await verifySessionOnServer({ redirectOnFail: true });

  const featureFlags = await getServerFeatureFlags();
  if (!featureFlags.onboarding) {
    redirect('/home');
  }

  return <OnboardingContainer />;
}
