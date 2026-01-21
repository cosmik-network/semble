import { getServerAuthStatus } from './serverAuth';

const APPROVED_HANDLES = new Set([
  'wesleyfinck.org',
  'ronentk.me',
  'pouriade.com',
  'bmann.ca',
  'tynanpurdy.com',
  'erlend.sh',
  'tgoerke.bsky.social',
  'psingletary.com',
]);

export async function getServerFeatureFlags() {
  const { user } = await getServerAuthStatus();

  const show =
    process.env.VERCEL_ENV !== 'production' ||
    (user?.handle && APPROVED_HANDLES.has(user.handle));

  return {
    cardSearch: show,
    urlTypeFilter: show,
    leafletMentions: show,
    animatedLandingTitle: show,
  };
}
