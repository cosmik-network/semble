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
