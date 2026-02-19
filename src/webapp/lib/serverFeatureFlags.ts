import { getServerAuthStatus } from './serverAuth';
import { INTERNAL_HANDLES } from './userLists';

export async function getServerFeatureFlags() {
  const { user } = await getServerAuthStatus();

  const show =
    process.env.VERCEL_ENV !== 'production' ||
    (user?.handle && INTERNAL_HANDLES.includes(user.handle));

  const showFollowing = process.env.VERCEL_ENV !== 'production';

  return {
    cardSearch: show,
    urlTypeFilter: show,
    leafletMentions: show,
    animatedLandingTitle: show,
    openCollections: true,
    following: showFollowing,
  };
}
