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
}

// A card and the feed menu name the same view, so the label comes from
// `feedViewLabel` rather than being written out a second time here.
//
// `as const satisfies` rather than a plain annotation: it keeps the ids as
// literals so `FeedDestinationId` below can be derived from them.
export const FEED_DESTINATIONS = [
  {
    id: 'feed-global',
    label: feedViewLabel('global'),
    description: 'Everything saved across Semble',
    feedView: 'global',
    urlType: null,
  },
  {
    id: 'feed-following',
    label: feedViewLabel('following'),
    description: 'People and collections you follow here',
    feedView: 'following',
    urlType: null,
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
  },
] as const satisfies readonly FeedDestination[];

/**
 * The feed ids as a union. `ExploreFeeds` keys its icon table by this, so a
 * feed added above without an icon fails the build instead of rendering a
 * card with an empty space where the icon goes.
 */
export type FeedDestinationId = (typeof FEED_DESTINATIONS)[number]['id'];

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
