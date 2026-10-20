import posthog from 'posthog-js';
import { shouldCaptureAnalytics } from '@/features/analytics/utils';
import { CardSaveSource } from '@/features/analytics/types';
import {
  EntrySource,
  ItemDestination,
  ItemTarget,
} from '@/features/analytics/pageVisit';

export type SembleTab =
  | 'similar'
  | 'collections'
  | 'mentions'
  | 'connections'
  | 'notes'
  | 'graph';

export type SembleAction = 'save' | 'connect' | 'reader' | 'open_link';

interface SembleVisit {
  visit_id: string;
  url: string;
  is_logged_in: boolean;
  entry_source: EntrySource;
}

// Module level rather than context: the reader button lives in the /url
// layout, outside the page tree that starts the visit.
let currentVisit: SembleVisit | null = null;

export function hasStartedSembleVisit() {
  return currentVisit !== null;
}

/** The `ref` a card link should carry, from where the card is listed */
export function sembleRefFromSaveSource(
  saveSource?: CardSaveSource,
): EntrySource | undefined {
  switch (saveSource) {
    case CardSaveSource.FEED:
      return 'feed';
    case CardSaveSource.SEARCH_RESULTS:
      return 'search';
    case CardSaveSource.PROFILE:
      return 'profile';
    case CardSaveSource.COLLECTION:
      return 'collection';
    case CardSaveSource.SEMBLE_PAGE:
    case CardSaveSource.SIMILAR_CARDS:
    case CardSaveSource.READER:
      return 'semble_page';
    default:
      return undefined;
  }
}

function capture(url: string, event: string, properties?: object) {
  // Dropped when the visit has moved on, e.g. a save that completes after
  // navigating to another semble page
  if (!shouldCaptureAnalytics() || currentVisit?.url !== url) return;
  posthog.capture(event, { ...currentVisit, ...properties });
}

export function startSembleVisit(visit: Omit<SembleVisit, 'visit_id'>) {
  currentVisit = { ...visit, visit_id: crypto.randomUUID() };
  capture(visit.url, 'semble_page:viewed');
}

export function trackSembleTabViewed(url: string, tab: SembleTab) {
  capture(url, 'semble_page:tab_viewed', { tab });
}

export function trackSembleItemClicked(
  url: string,
  tab: SembleTab,
  click: { target: ItemTarget; destination: ItemDestination },
) {
  capture(url, 'semble_page:item_clicked', { tab, ...click });
}

export function trackSembleAction(url: string, action: SembleAction) {
  capture(url, 'semble_page:action', { action });
}
