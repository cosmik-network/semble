import type { Query, QueryClient } from '@tanstack/react-query';
import { linkKey } from '../model/linkCards';
import type { LinkInfo } from '../server/canvasServer';
import { canvasKeys } from './canvasKeys';

// Tells canvases in other tabs which links changed. Each tab has its own query
// cache, so a change made there doesn't reach a board here otherwise.
export const LINK_CHANGES_CHANNEL = 'canvas-changed-links';

export interface LinkChange {
  urls?: string[];
  // Connections changed or deleted; boards refetch the links they join
  connectionIds?: string[];
}

export function announceLinkChange(change: LinkChange) {
  const channel = new BroadcastChannel(LINK_CHANGES_CHANNEL);
  channel.postMessage(change);
  channel.close();
}

export const isCanvasLinkQuery = (query: Query) =>
  typeof query.meta?.linkUrl === 'string';

// Only the links a change touches, rather than every link on a board
export function invalidateChangedLinks(
  queryClient: QueryClient,
  change: LinkChange,
) {
  const urls = (change.urls ?? []).map((url) => linkKey(url) ?? url);
  const connectionIds = change.connectionIds ?? [];
  queryClient.invalidateQueries({
    queryKey: canvasKeys.links(),
    predicate: (query) => {
      if (urls.includes(query.meta?.linkUrl as string)) return true;
      const link = query.state.data as LinkInfo | undefined;
      return !!link?.connections?.some(({ id }) => connectionIds.includes(id));
    },
  });
  announceLinkChange(change);
}
