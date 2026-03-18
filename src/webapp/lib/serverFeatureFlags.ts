import { getServerAuthStatus } from './serverAuth';

const TEAM_HANDLES = new Set(['wesleyfinck.org', 'ronentk.me', 'pouriade.com']);

const EARLY_TESTERS_HANDLES = new Set([
  'bmann.ca',
  'tynanpurdy.com',
  'erlend.sh',
  'tgoerke.bsky.social',
  'psingletary.com',
  'hilarybaumann.com',
  'cosmik.network',
  'semble.so',
  'atproto.science',
  'chrisshank.com',
  'jasmine-pyz.bsky.social',
  'uppy-hacker.bsky.social',
  'joelchan86.bsky.social',
]);

export async function getServerFeatureFlags() {
  const { user } = await getServerAuthStatus();

  const show =
    process.env.VERCEL_ENV !== 'production' ||
    (user?.handle &&
      (EARLY_TESTERS_HANDLES.has(user.handle) ||
        TEAM_HANDLES.has(user.handle)));

  const showForTeam =
    process.env.VERCEL_ENV !== 'production' ||
    (user?.handle && TEAM_HANDLES.has(user.handle));

  return {
    cardSearch: show,
    urlTypeFilter: show,
    leafletMentions: show,
    animatedLandingTitle: show,
    openCollections: true,
    following: true,
    connections: show,
    graphView: show,
  };
}
