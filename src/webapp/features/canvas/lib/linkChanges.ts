import type { Query, QueryClient } from '@tanstack/react-query';
import { linkKey } from '../model/linkCards';
import type { LinkConnection, LinkInfo } from '../server/canvasServer';
import { canvasKeys } from './canvasKeys';

// Tells canvases in other tabs which links changed. Each tab has its own query
// cache, so a change made there doesn't reach a board here otherwise.
export const LINK_CHANGES_CHANNEL = 'canvas-changed-links';

export interface LinkChange {
  urls?: string[];
  // Connections changed or deleted; boards refetch the links they join
  connectionIds?: string[];
}

// Whether a change touches a link: by its URL, or by a connection it lists
function touchedBy(change: LinkChange) {
  const urls = (change.urls ?? []).map((url) => linkKey(url) ?? url);
  const connectionIds = change.connectionIds ?? [];
  return (url: unknown, connections: LinkConnection[] | null | undefined) =>
    urls.includes(url as string) ||
    !!connections?.some(({ id }) => connectionIds.includes(id));
}

interface Tab {
  channel: BroadcastChannel | null;
  watchers: Set<(change: LinkChange) => void>;
  pending: { urls: Set<string>; connectionIds: Set<string> } | null;
}

// A tab is its query cache. Each sends and receives on one channel, so it
// doesn't hear its own changes, which its cache already has.
const tabs = new WeakMap<QueryClient, Tab>();

function tabOf(queryClient: QueryClient) {
  let tab = tabs.get(queryClient);
  if (!tab) {
    tab = { channel: null, watchers: new Set(), pending: null };
    tabs.set(queryClient, tab);
  }
  return tab;
}

function openChannel(tab: Tab) {
  if (!tab.channel) {
    tab.channel = new BroadcastChannel(LINK_CHANGES_CHANNEL);
    tab.channel.onmessage = (event: MessageEvent<LinkChange>) =>
      tab.watchers.forEach((watcher) => watcher(event.data));
  }
  return tab.channel;
}

function closeIfIdle(tab: Tab) {
  if (tab.watchers.size > 0 || tab.pending) return;
  tab.channel?.close();
  tab.channel = null;
}

// Changes announced in the same task go out as one message. A board's cache
// hears of an invalidation a task later, on a timer set before this one, so
// the links it announces then join the change that invalidated them.
export function announceLinkChange(
  queryClient: QueryClient,
  change: LinkChange,
) {
  const tab = tabOf(queryClient);
  if (!tab.pending) {
    tab.pending = { urls: new Set(), connectionIds: new Set() };
    setTimeout(() => {
      const { urls, connectionIds } = tab.pending!;
      tab.pending = null;
      openChannel(tab).postMessage({
        ...(urls.size > 0 && { urls: Array.from(urls) }),
        ...(connectionIds.size > 0 && {
          connectionIds: Array.from(connectionIds),
        }),
      } satisfies LinkChange);
      closeIfIdle(tab);
    });
  }
  change.urls?.forEach((url) => tab.pending!.urls.add(url));
  change.connectionIds?.forEach((id) => tab.pending!.connectionIds.add(id));
}

// Calls back with each of the board's links a change in another tab touches.
// Returns the unwatch.
export function watchLinkChanges(
  queryClient: QueryClient,
  board: {
    urls(): string[];
    connectionsOf(url: string): LinkConnection[] | null | undefined;
    onChanged(url: string): void;
  },
) {
  const tab = tabOf(queryClient);
  const watcher = (change: LinkChange) => {
    const touches = touchedBy(change);
    board
      .urls()
      .filter((url) => touches(url, board.connectionsOf(url)))
      .forEach(board.onChanged);
  };
  tab.watchers.add(watcher);
  openChannel(tab);
  return () => {
    tab.watchers.delete(watcher);
    closeIfIdle(tab);
  };
}

export const isCanvasLinkQuery = (query: Query) =>
  typeof query.meta?.linkUrl === 'string';

// Only the links a change touches, rather than every link on a board
export function invalidateChangedLinks(
  queryClient: QueryClient,
  change: LinkChange,
) {
  const touches = touchedBy(change);
  queryClient.invalidateQueries({
    queryKey: canvasKeys.links(),
    predicate: (query) =>
      touches(
        query.meta?.linkUrl,
        (query.state.data as LinkInfo | undefined)?.connections,
      ),
  });
  announceLinkChange(queryClient, change);
}
