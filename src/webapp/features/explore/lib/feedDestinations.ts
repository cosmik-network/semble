import { UrlType } from '@semble/types';
import {
  FeedView,
  feedViewLabel,
  feedViewRequiresAuth,
} from '@/features/feeds/lib/feedOptions';

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
    requiresAuth: feedViewRequiresAuth('global'),
  },
  {
    id: 'feed-following',
    label: feedViewLabel('following'),
    description: 'People and collections you follow here',
    feedView: 'following',
    urlType: null,
    requiresAuth: feedViewRequiresAuth('following'),
  },
  {
    // Ungated on purpose. The `bskyFollows` flag is `showForTeam`, so only the
    // team reaches /settings/bluesky-follows in production — that flag covers
    // managing the follows, not reading the feed they produce.
    id: 'feed-bsky-following',
    label: feedViewLabel('bskyFollowing'),
    description: 'People you follow on Bluesky who are on Semble',
    feedView: 'bskyFollowing',
    urlType: null,
    requiresAuth: feedViewRequiresAuth('bskyFollowing'),
  },
];

/*
 * The type rail, in the order it is read: by how often a type turns up rather
 * than by the enum, so the rail opens on the types most readers want.
 *
 * Labels are plural where the word pluralises — the tiles read as categories,
 * where `upperFirst(type)` (what the filter controls elsewhere use) would give
 * "Article"/"Video" and read as a single item rather than a shelf.
 *
 * Order and label sit in one table so they cannot drift apart. Neither is
 * exhaustive by type any more; the coverage test in `feedDestinations.test.ts`
 * is what fails when a new `UrlType` is added without a tile.
 */
const TYPE_TILES: { type: UrlType; label: string }[] = [
  { type: UrlType.ARTICLE, label: 'Articles' },
  { type: UrlType.VIDEO, label: 'Videos' },
  { type: UrlType.AUDIO, label: 'Audio' },
  { type: UrlType.RESEARCH, label: 'Research' },
  { type: UrlType.BOOK, label: 'Books' },
  { type: UrlType.SOCIAL, label: 'Social' },
  { type: UrlType.SOFTWARE, label: 'Software' },
  { type: UrlType.EVENT, label: 'Events' },
  { type: UrlType.LINK, label: 'Links' },
];

export const TYPE_DESTINATIONS: FeedDestination[] = TYPE_TILES.map((tile) => ({
  id: `type-${tile.type}`,
  label: tile.label,
  description: '',
  feedView: 'global',
  urlType: tile.type,
  requiresAuth: feedViewRequiresAuth('global'),
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
