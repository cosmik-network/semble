import { queryOptions } from '@tanstack/react-query';
import type { AppBskyFeedDefs } from '@atproto/api';
import type { ConnectionType, UrlMetadata, User } from '@semble/types';
import { canvasKeys } from '../lib/canvasKeys';

export interface LinkConnection {
  id: string;
  type: ConnectionType | null;
  sourceUrl: string;
  targetUrl: string;
  curatorId: string;
}

// What a link card shows about its link, the same on every copy
export interface LinkInfo {
  url: string;
  metadata: UrlMetadata;
  // Whether the link is in the viewer's library
  saved: boolean;
  // The note on the viewer's own card for the link
  note: { id: string; text: string; author: User } | null;
  // Null if they couldn't be loaded
  connections: LinkConnection[] | null;
  // A Bluesky or Blacksky post's link: the post, or null if it couldn't be
  // loaded. Missing from links fetched before posts were.
  post?: AppBskyFeedDefs.PostView | null;
}

export interface NewConnection {
  sourceUrl: string;
  targetUrl: string;
  type: ConnectionType;
}

// What an edit to a connection changes; swap flips its direction
export interface ConnectionChange {
  type?: ConnectionType;
  swap?: boolean;
}

export interface CanvasServer {
  // Links it couldn't load are left out
  getLinks(urls: string[]): Promise<Map<string, LinkInfo>>;
  // The viewer's most recent links, or those matching the query
  searchLibrary(query: string): Promise<UrlMetadata[]>;
  // Links anyone on Semble has saved that match the query
  searchEveryone(query: string): Promise<UrlMetadata[]>;
  // Resolves with the new connection's id
  createConnection(connection: NewConnection): Promise<string>;
  updateConnection(
    connectionId: string,
    change: ConnectionChange,
  ): Promise<void>;
  // Also deletes the notifications the connection created
  deleteConnection(connectionId: string): Promise<void>;
}

// Links requested in the same tick go to the server as one getLinks call
const BATCH_SIZE = 100;

interface Waiting {
  resolve(link: LinkInfo): void;
  reject(error: unknown): void;
}

function createLinkBatcher(server: CanvasServer) {
  let pending = new Map<string, Waiting[]>();

  const send = (batch: Map<string, Waiting[]>) => {
    const urls = Array.from(batch.keys());
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const chunk = urls.slice(i, i + BATCH_SIZE);
      server.getLinks(chunk).then(
        (links) => {
          for (const url of chunk) {
            const link = links.get(url);
            for (const waiting of batch.get(url)!) {
              if (link) waiting.resolve(link);
              else waiting.reject(new Error(`Couldn't load ${url}`));
            }
          }
        },
        (error) => {
          for (const url of chunk) {
            for (const waiting of batch.get(url)!) waiting.reject(error);
          }
        },
      );
    }
  };

  return (url: string) => {
    if (pending.size === 0) {
      setTimeout(() => {
        const batch = pending;
        pending = new Map();
        send(batch);
      });
    }
    return new Promise<LinkInfo>((resolve, reject) => {
      pending.set(url, [...(pending.get(url) ?? []), { resolve, reject }]);
    });
  };
}

const batchers = new WeakMap<
  CanvasServer,
  (url: string) => Promise<LinkInfo>
>();

function loadLink(server: CanvasServer, url: string) {
  let load = batchers.get(server);
  if (!load) {
    load = createLinkBatcher(server);
    batchers.set(server, load);
  }
  return load(url);
}

// Shared by the cards, which read it, and the controller, which fetches it
export function linkQuery(server: CanvasServer, url: string) {
  return queryOptions({
    queryKey: canvasKeys.link(url),
    queryFn: () => loadLink(server, url),
    meta: { linkUrl: url },
    staleTime: 60_000,
  });
}

export type SearchScope = 'mine' | 'everyone';

export function linkSearchQuery(
  server: CanvasServer,
  scope: SearchScope,
  query: string,
) {
  return queryOptions({
    queryKey:
      scope === 'mine'
        ? canvasKeys.librarySearch(query)
        : canvasKeys.sembleSearch(query),
    queryFn: async () => {
      if (scope === 'mine') return server.searchLibrary(query);
      // Everyone has no recent links to list
      return query ? server.searchEveryone(query) : [];
    },
    meta: { searchScope: scope },
    // Only while typing, so one scope's results never show under the other
    placeholderData: (previous, previousQuery) =>
      previousQuery?.meta?.searchScope === scope ? previous : undefined,
  });
}
