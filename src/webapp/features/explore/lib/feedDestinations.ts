import { UrlType } from '@semble/types';
import { FeedView, feedViewLabel } from '@/features/feeds/lib/feedOptions';

/** One tile in the explore "Happening now" section. */
export interface FeedDestination {
  /** Stable key for React lists and analytics. Unique across both tables. */
  id: string;
  label: string;
  description: string;
  feedView: FeedView;
  urlType: UrlType | null;
  requiresAuth: boolean;
}

// A card and the feed menu name the same view, so the label comes from
// `feedViewLabel` rather than being written out a second time here.
export const FEED_DESTINATIONS: FeedDestination[] = [
  {
    id: 'feed-global',
    label: feedViewLabel('global'),
    description: 'Everything saved across Semble',
    feedView: 'global',
    urlType: null,
    requiresAuth: false,
  },
  {
    id: 'feed-following',
    label: feedViewLabel('following'),
    description: 'People and collections you follow here',
    feedView: 'following',
    urlType: null,
    requiresAuth: true,
  },
  {
    id: 'feed-bsky-following',
    label: feedViewLabel('bskyFollowing'),
    description: 'People you follow on Bluesky who are on Semble',
    feedView: 'bskyFollowing',
    urlType: null,
    requiresAuth: true,
  },
];

// The tiles read as categories, so they are plural where the word pluralises.
// `upperFirst(type)` — what the filter controls elsewhere use — would give
// "Article"/"Video", which reads as a single item rather than a shelf.
const URL_TYPE_LABELS: Record<UrlType, string> = {
  [UrlType.ARTICLE]: 'Articles',
  [UrlType.VIDEO]: 'Videos',
  [UrlType.AUDIO]: 'Audio',
  [UrlType.RESEARCH]: 'Research',
  [UrlType.BOOK]: 'Books',
  [UrlType.SOCIAL]: 'Social',
  [UrlType.SOFTWARE]: 'Software',
  [UrlType.EVENT]: 'Events',
  [UrlType.LINK]: 'Links',
};

// Ordered by how often they turn up, not by the enum, so the rail opens on
// the types most readers want.
const TYPE_ORDER: UrlType[] = [
  UrlType.ARTICLE,
  UrlType.VIDEO,
  UrlType.AUDIO,
  UrlType.RESEARCH,
  UrlType.BOOK,
  UrlType.SOCIAL,
  UrlType.SOFTWARE,
  UrlType.EVENT,
  UrlType.LINK,
];

export const TYPE_DESTINATIONS: FeedDestination[] = TYPE_ORDER.map((type) => ({
  id: `type-${type}`,
  label: URL_TYPE_LABELS[type],
  description: '',
  feedView: 'global',
  urlType: type,
  requiresAuth: false,
}));

/** The settings a destination implies. */
export interface FeedSettingsPatch {
  feedView: FeedView;
  feedUrlType: UrlType | null;
  feedSource: null;
  feedActivityType: null;
}

/**
 * A destination is a complete feed state, not a partial mutation: a type tile
 * that only set `feedUrlType` would inherit whatever view the reader last
 * left set, and a feed card that left `feedSource` on Margin would land on a
 * feed that source cannot serve.
 */
export function feedSettingsFor(
  destination: FeedDestination,
): FeedSettingsPatch {
  return {
    feedView: destination.feedView,
    feedUrlType: destination.urlType,
    feedSource: null,
    feedActivityType: null,
  };
}

export type FeedAction = 'disabled' | 'login' | 'navigate';

/**
 * What a click on a destination should do. `disabled` covers the window
 * before the session resolves — navigating then would bounce a signed-in
 * reader to /login.
 */
export function resolveFeedAction(params: {
  requiresAuth: boolean;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
}): FeedAction {
  if (!params.requiresAuth) return 'navigate';
  if (params.isAuthLoading) return 'disabled';
  if (!params.isAuthenticated) return 'login';
  return 'navigate';
}
