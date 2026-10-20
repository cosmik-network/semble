// Shared pieces of the per-page visit analytics (semble page, collection page)

export const ENTRY_SOURCES = [
  'feed',
  'search',
  'semble_page',
  'collection',
  'profile',
  'extension',
  'external',
] as const;

/** `other` is an internal navigation whose link carried no `ref` */
export type EntrySource = (typeof ENTRY_SOURCES)[number] | 'other';

export type ItemTarget = 'open' | 'save' | 'follow' | 'connect' | 'external';

export type ItemDestination =
  | 'semble_page'
  | 'collection_page'
  | 'profile'
  | 'external_url'
  | 'none';

export function isEntrySource(
  value: string | null | undefined,
): value is (typeof ENTRY_SOURCES)[number] {
  return ENTRY_SOURCES.includes(value as never);
}

export function isExternalHref(href: string) {
  return new URL(href, window.location.href).origin !== window.location.origin;
}

/**
 * The link's `ref` when it has a valid one. Otherwise `other` for an in-app
 * arrival (a link that is not tagged yet) and `external` for everything else.
 */
export function resolveEntrySource(
  ref: string | null | undefined,
  hasNavigated: boolean,
): EntrySource {
  if (isEntrySource(ref)) return ref;

  const fromSemble = !!document.referrer && !isExternalHref(document.referrer);
  return hasNavigated || fromSemble ? 'other' : 'external';
}

function destinationFromPath(pathname: string): ItemDestination {
  if (pathname === '/url') return 'semble_page';
  if (pathname.includes('/collections/')) return 'collection_page';
  if (pathname.startsWith('/profile/')) return 'profile';
  return 'none';
}

export const ITEM_CLICK_SELECTOR = 'a[href], [data-analytics-target]';

/**
 * Classifies a click on an item in a tab. Links are classified by their href;
 * anything else must opt in with `data-analytics-target` (and optionally
 * `data-analytics-destination`), so filters and menus are not counted.
 */
export function describeItemClick(el: HTMLElement): {
  target: ItemTarget;
  destination: ItemDestination;
} | null {
  const target = el.dataset.analyticsTarget as ItemTarget | undefined;
  if (target) {
    return {
      target,
      destination:
        (el.dataset.analyticsDestination as ItemDestination) ?? 'none',
    };
  }

  const href = el.getAttribute('href');
  if (!href) return null;

  if (isExternalHref(href)) {
    return { target: 'external', destination: 'external_url' };
  }
  return {
    target: 'open',
    destination: destinationFromPath(
      new URL(href, window.location.href).pathname,
    ),
  };
}

/**
 * The item a click inside `container` landed on, or null. React bubbles events
 * out of portals (modals, menus), so clicks outside the container's DOM are
 * ignored.
 */
export function findClickedItem(container: Element, target: Element) {
  if (!container.contains(target)) return null;
  const item = target.closest<HTMLElement>(ITEM_CLICK_SELECTOR);
  return item && container.contains(item) ? item : null;
}
