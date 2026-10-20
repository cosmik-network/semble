import posthog from 'posthog-js';
import { shouldCaptureAnalytics } from '@/features/analytics/utils';
import { CardSaveSource } from '@/features/analytics/types';

export const SEMBLE_ENTRY_SOURCES = [
  'feed',
  'search',
  'semble_page',
  'collection',
  'profile',
  'extension',
  'external',
] as const;

/** `other` is an internal navigation whose link carried no `ref` */
export type SembleEntrySource = (typeof SEMBLE_ENTRY_SOURCES)[number] | 'other';

export type SembleTab =
  | 'similar'
  | 'collections'
  | 'mentions'
  | 'connections'
  | 'notes'
  | 'graph';

export type SembleItemTarget =
  | 'open'
  | 'save'
  | 'follow'
  | 'connect'
  | 'external';

export type SembleItemDestination =
  | 'semble_page'
  | 'collection_page'
  | 'profile'
  | 'external_url'
  | 'none';

export type SembleAction = 'save' | 'connect' | 'reader' | 'open_link';

interface SembleVisit {
  visit_id: string;
  url: string;
  is_logged_in: boolean;
  entry_source: SembleEntrySource;
}

// Module level rather than context: the reader button lives in the /url
// layout, outside the page tree that starts the visit.
let currentVisit: SembleVisit | null = null;

export function hasStartedSembleVisit() {
  return currentVisit !== null;
}

export function isSembleEntrySource(
  value: string | null | undefined,
): value is (typeof SEMBLE_ENTRY_SOURCES)[number] {
  return SEMBLE_ENTRY_SOURCES.includes(value as never);
}

/** The `ref` a card link should carry, from where the card is listed */
export function sembleRefFromSaveSource(
  saveSource?: CardSaveSource,
): SembleEntrySource | undefined {
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
  click: { target: SembleItemTarget; destination: SembleItemDestination },
) {
  capture(url, 'semble_page:item_clicked', { tab, ...click });
}

export function trackSembleAction(url: string, action: SembleAction) {
  capture(url, 'semble_page:action', { action });
}

function destinationFromPath(pathname: string): SembleItemDestination {
  if (pathname === '/url') return 'semble_page';
  if (pathname.includes('/collections/')) return 'collection_page';
  if (pathname.startsWith('/profile/')) return 'profile';
  return 'none';
}

/**
 * Classifies a click inside a semble tab. Links are classified by their href;
 * anything else must opt in with `data-analytics-target` (and optionally
 * `data-analytics-destination`), so filters and menus are not counted.
 */
export function describeSembleItemClick(el: HTMLElement): {
  target: SembleItemTarget;
  destination: SembleItemDestination;
} | null {
  const target = el.dataset.analyticsTarget as SembleItemTarget | undefined;
  if (target) {
    return {
      target,
      destination:
        (el.dataset.analyticsDestination as SembleItemDestination) ?? 'none',
    };
  }

  const href = el.getAttribute('href');
  if (!href) return null;

  const resolved = new URL(href, window.location.href);
  if (resolved.origin !== window.location.origin) {
    return { target: 'external', destination: 'external_url' };
  }
  return {
    target: 'open',
    destination: destinationFromPath(resolved.pathname),
  };
}

export const SEMBLE_ITEM_CLICK_SELECTOR = 'a[href], [data-analytics-target]';
