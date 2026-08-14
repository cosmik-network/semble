import { getOnboardingState } from '../../lib/dal.server';
import { resumePoint } from '../../lib/resumePoint';
import HomeOnboardingBannerCard from './HomeOnboardingBannerCard';

export default async function HomeOnboardingBanner() {
  const state = await getOnboardingState().catch(() => null);
  const status = state?.onboardingState ?? 'NOT_STARTED';
  const isResuming = status === 'IN_PROGRESS';

  if (status !== 'NOT_STARTED' && !isResuming) return null;

  return (
    <HomeOnboardingBannerCard
      isResuming={isResuming}
      resume={resumePoint(isResuming, state)}
    />
  );
}
