import {
  getCardFromMyLibrary,
  getMyUrlCards,
  getUrlMetadata,
} from '@/features/cards/lib/dal';
import { getConnectionsForUrl } from '@/features/connections/lib/dal';
import type { ConnectionType, UrlMetadata } from '@semble/types';
import type { CanvasServer, LinkConnection, LinkInfo } from './canvasServer';

// Until a batch endpoint exists (#982), each link takes a call for its library
// status and one per page of its connections, plus its metadata the first time
const MAX_LINKS_IN_FLIGHT = 6;

function limitConcurrency(max: number) {
  let running = 0;
  const queue: (() => void)[] = [];
  return async <T>(call: () => Promise<T>): Promise<T> => {
    if (running < max) running++;
    else await new Promise<void>((go) => queue.push(go));
    try {
      return await call();
    } finally {
      // Handed straight to the next call, so none can slip in between
      const next = queue.shift();
      if (next) next();
      else running--;
    }
  };
}

const limit = limitConcurrency(MAX_LINKS_IN_FLIGHT);

// A page's metadata rarely changes, so refreshes fetch only what does: whether
// the link is saved, and the note
const metadataOf = new Map<string, UrlMetadata>();

async function getMetadata(url: string) {
  const known = metadataOf.get(url);
  if (known) return known;
  const { metadata } = await getUrlMetadata({ url });
  metadataOf.set(url, metadata);
  return metadata;
}

const CONNECTIONS_PAGE_SIZE = 100;

async function fetchConnections(url: string) {
  const connections: LinkConnection[] = [];
  for (let page = 1; ; page++) {
    const response = await getConnectionsForUrl({
      url,
      direction: 'both',
      page,
      limit: CONNECTIONS_PAGE_SIZE,
    });
    for (const { connection, source, target } of response.connections) {
      connections.push({
        id: connection.id,
        type: (connection.type as ConnectionType | undefined) ?? null,
        sourceUrl: source.url,
        targetUrl: target.url,
        curatorId: connection.curator.id,
      });
    }
    if (!response.pagination.hasMore) return connections;
  }
}

// The card still shows if its connections don't load
async function getConnections(url: string) {
  try {
    return await fetchConnections(url);
  } catch (error) {
    console.warn(error);
    return null;
  }
}

async function getLink(url: string): Promise<LinkInfo> {
  const [metadata, { card }, connections] = await Promise.all([
    getMetadata(url),
    getCardFromMyLibrary(url),
    getConnections(url),
  ]);
  return {
    url,
    metadata,
    saved: !!card,
    note: card?.note ? { ...card.note, author: card.author } : null,
    connections,
  };
}

export const apiCanvasServer: CanvasServer = {
  async getLinks(urls) {
    const links = new Map<string, LinkInfo>();
    await Promise.all(
      urls.map((url) =>
        limit(() => getLink(url)).then(
          (link) => links.set(url, link),
          (error) => console.warn(error),
        ),
      ),
    );
    return links;
  },
  async searchLibrary(query) {
    const { cards } = await getMyUrlCards({
      limit: 8,
      searchText: query || undefined,
    });
    return cards.map((card) => card.cardContent);
  },
};
