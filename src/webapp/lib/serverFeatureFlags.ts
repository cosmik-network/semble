import { getServerAuthStatus } from './serverAuth';
import { INTERNAL_HANDLES } from './userLists';
import { isApprovedHandle } from './approvedHandles';

export async function getServerFeatureFlags() {
  const { user } = await getServerAuthStatus();

  const show =
    process.env.VERCEL_ENV !== 'production' ||
    (user?.handle && INTERNAL_HANDLES.includes(user.handle));

  return {
    cardSearch: show,
    urlTypeFilter: show,
    leafletMentions: show,
    animatedLandingTitle: show,
    openCollections: true,
    following: show || (user?.handle && isApprovedHandle(user.handle)),
  };
}
