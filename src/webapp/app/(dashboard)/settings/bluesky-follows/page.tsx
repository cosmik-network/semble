import { redirect } from 'next/navigation';
import { getServerFeatureFlags } from '@/lib/serverFeatureFlags';
import BskyFollowsContainer from '@/features/follows/containers/bskyFollowsContainer/BskyFollowsContainer';

export default async function Page() {
  const featureFlags = await getServerFeatureFlags();
  if (!featureFlags.bskyFollows) {
    redirect('/settings');
  }

  return <BskyFollowsContainer />;
}
