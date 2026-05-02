import { getServerAuthStatus } from './serverAuth';
import {
  TEAM_HANDLES,
  EARLY_TESTERS_HANDLES,
} from '../../shared/constants/featureFlags';

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
    connections: true,
    graphView: show,
    readerMode: showForTeam,
  };
}
