import posthog from 'posthog-js';
import { shouldCaptureAnalytics } from '@/features/analytics/utils';
import {
  EntrySource,
  ItemClick,
  ListDepth,
} from '@/features/analytics/pageVisit';
import { UserSettings } from '@/features/settings/lib/queries/useUserSettings';

export type HomeFeedFilter = 'view' | 'source' | 'activity_type' | 'url_type';

export type HomeFeedAction =
  | 'refresh'
  | 'load_more'
  | 'open_settings'
  | 'open_explore';

/** Which feed is showing. Sent with every event, as of when it happened. */
export interface HomeFeedState {
  feed_view: UserSettings['feedView'];
  feed_source: string | null;
  feed_activity_type: string | null;
  feed_url_type: string | null;
  include_known_bots: boolean;
}

interface HomeVisit {
  visit_id: string;
  is_logged_in: boolean;
  entry_source: EntrySource;
}

// Module level rather than context: the feed controls sit in the home layout,
// beside rather than inside the feed tree. Never cleared, since the list's
// last depth report goes out as it unmounts on leaving home; everything that
// reports here only renders on home, and the next visit replaces this one.
let currentVisit: HomeVisit | null = null;

export function homeFeedStateFromSettings(
  settings: UserSettings,
): HomeFeedState {
  return {
    feed_view: settings.feedView,
    feed_source: settings.feedSource,
    feed_activity_type: settings.feedActivityType,
    feed_url_type: settings.feedUrlType,
    include_known_bots: settings.includeKnownBots,
  };
}

function capture(event: string, state: HomeFeedState, properties?: object) {
  if (!shouldCaptureAnalytics() || !currentVisit) return;
  posthog.capture(event, { ...currentVisit, ...state, ...properties });
}

export function startHomeVisit(
  visit: Omit<HomeVisit, 'visit_id'>,
  state: HomeFeedState,
) {
  currentVisit = { ...visit, visit_id: crypto.randomUUID() };
  capture('home_feed:viewed', state);
}

/** `state` is the feed before the change; `to` is the new value. */
export function trackHomeFeedFilterChanged(
  state: HomeFeedState,
  filter: HomeFeedFilter,
  to: string | null,
) {
  capture('home_feed:filter_changed', state, { filter, to });
}

export function trackHomeFeedFiltersCleared(
  state: HomeFeedState,
  via: 'menu' | 'empty_state',
) {
  capture('home_feed:filters_cleared', state, { via });
}

export function trackHomeFeedItemClicked(
  state: HomeFeedState,
  click: ItemClick & { activity_type?: string },
) {
  capture('home_feed:item_clicked', state, click);
}

export function trackHomeFeedListDepth(state: HomeFeedState, depth: ListDepth) {
  capture('home_feed:list_depth', state, depth);
}

export function trackHomeFeedAction(
  state: HomeFeedState,
  action: HomeFeedAction,
) {
  capture('home_feed:action', state, { action });
}
