import posthog from 'posthog-js';
import { shouldCaptureAnalytics } from '@/features/analytics/utils';
import {
  EntrySource,
  ItemDestination,
  ItemTarget,
} from '@/features/analytics/pageVisit';

export type CollectionTab =
  | 'cards'
  | 'similar'
  | 'mentions'
  | 'connections'
  | 'appears_in';

export type CollectionAction =
  | 'follow'
  | 'unfollow'
  | 'save'
  | 'connect'
  | 'share'
  | 'view_followers'
  | 'view_author';

interface CollectionVisit {
  visit_id: string;
  /** at-uri of the collection */
  collection_id: string;
  is_logged_in: boolean;
  is_owner: boolean;
  entry_source: EntrySource;
}

// Module level rather than context: the share button sits in the page's
// header bar, outside the tree that starts the visit. Keyed by rkey, which
// every part of the page has (the route handle may be a DID, so not that).
let currentVisit: { rkey: string; props: CollectionVisit } | null = null;

/** The tab for a collection page path segment (the one after the rkey) */
export function collectionTabFromSegment(segment?: string): CollectionTab {
  switch (segment) {
    case 'similar-cards':
      return 'similar';
    case 'mentions':
    case 'connections':
      return segment;
    case 'appears-in':
      return 'appears_in';
    default:
      return 'cards';
  }
}

function capture(rkey: string, event: string, properties?: object) {
  // Dropped when the visit has moved on, e.g. a save that completes after
  // navigating to another collection
  if (!shouldCaptureAnalytics() || currentVisit?.rkey !== rkey) return;
  posthog.capture(event, { ...currentVisit.props, ...properties });
}

export function startCollectionVisit(
  rkey: string,
  visit: Omit<CollectionVisit, 'visit_id'> & { card_count: number },
) {
  const { card_count, ...props } = visit;
  currentVisit = { rkey, props: { ...props, visit_id: crypto.randomUUID() } };
  capture(rkey, 'collection_page:viewed', { card_count });
}

export function trackCollectionTabViewed(rkey: string, tab: CollectionTab) {
  capture(rkey, 'collection_page:tab_viewed', { tab });
}

export function trackCollectionItemClicked(
  rkey: string,
  tab: CollectionTab,
  click: { target: ItemTarget; destination: ItemDestination },
) {
  capture(rkey, 'collection_page:item_clicked', { tab, ...click });
}

export function trackCollectionAction(rkey: string, action: CollectionAction) {
  capture(rkey, 'collection_page:action', { action });
}
