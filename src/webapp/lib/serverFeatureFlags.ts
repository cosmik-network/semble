import { getServerAuthStatus } from './serverAuth';
import { isApprovedHandle } from './approvedHandles';

export async function getServerFeatureFlags() {
  const { user } = await getServerAuthStatus();
  const show = isApprovedHandle(user?.handle);

  return {
    cardSearch: true,
    urlTypeFilter: true,
    leafletMentions: show,
    animatedLandingTitle: true,
    openCollections: true,
    following: show,
  };
}
