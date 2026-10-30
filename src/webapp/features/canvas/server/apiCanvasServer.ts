import {
  getCardFromMyLibrary,
  getMyUrlCards,
  getUrlMetadata,
} from '@/features/cards/lib/dal';
import {
  createConnection,
  deleteConnection,
  getConnectionsForUrl,
  searchUrls,
  updateConnection,
} from '@/features/connections/lib/dal';
import { getCollectionPage } from '@/features/collections/lib/dal';
import { getBlueskyPost } from '@/features/platforms/bluesky/lib/dal';
import { getPostUriFromUrl, getRecordKey } from '@/lib/utils/atproto';
import { detectUrlPlatform, SupportedPlatform } from '@/lib/utils/link';
import { AppBskyFeedDefs } from '@atproto/api';
import {
  CollectionAccessType,
  type ConnectionType,
  type GetCollectionPageResponse,
  type UrlMetadata,
  type User,
} from '@semble/types';
import type {
  CanvasServer,
  CollectionPage,
  LinkConnection,
  LinkInfo,
} from './canvasServer';

// Until a batch endpoint exists (#982), each link takes a call for its library
// status and one per page of its connections, plus its metadata the first time
// and, for a Bluesky post, one to Bluesky
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

const SEARCH_RESULTS = 8;

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

function isPostLink(url: string) {
  const platform = detectUrlPlatform(url).type;
  return (
    platform === SupportedPlatform.BLUESKY_POST ||
    platform === SupportedPlatform.BLACKSKY_POST
  );
}

// Fetched on every refresh, as its labels can change. A refresh that fails
// keeps the post as it last loaded.
const postOf = new Map<string, AppBskyFeedDefs.PostView>();

async function getPost(url: string) {
  try {
    const data = await getBlueskyPost(getPostUriFromUrl(url));
    const thread = data?.thread;
    if (!thread || !AppBskyFeedDefs.isThreadViewPost(thread)) {
      postOf.delete(url);
      return null;
    }
    postOf.set(url, thread.post);
    return thread.post;
  } catch (error) {
    console.warn(error);
    return postOf.get(url) ?? null;
  }
}

async function getLink(url: string): Promise<LinkInfo> {
  const [metadata, { card }, connections, post] = await Promise.all([
    getMetadata(url),
    getCardFromMyLibrary(url),
    getConnections(url),
    isPostLink(url) ? getPost(url) : null,
  ]);
  return {
    url,
    metadata,
    saved: !!card,
    note: card?.note ? { ...card.note, author: card.author } : null,
    connections,
    post,
  };
}

// Only what the board shows, as it's kept in the board's document
const shownUser = (user: User): User => ({
  id: user.id,
  name: user.name,
  handle: user.handle,
  avatarUrl: user.avatarUrl,
});

function collectionPage(response: GetCollectionPageResponse): CollectionPage {
  return {
    collection: {
      id: response.id,
      handle: response.author.handle,
      rkey: getRecordKey(response.uri ?? ''),
      name: response.name,
      description: response.description ?? null,
      open: response.accessType === CollectionAccessType.OPEN,
      author: shownUser(response.author),
      cardCount: response.cardCount,
      updatedAt: response.updatedAt,
    },
    entries: response.urlCards.map((card) => ({
      cardId: card.id,
      url: card.url,
      author: shownUser(card.author),
      note: card.note ?? null,
    })),
    hasMore: response.pagination.hasMore,
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
  async getCollection(collectionId, { page, limit }) {
    return collectionPage(
      await getCollectionPage(collectionId, { page, limit }),
    );
  },
  async createConnection({ sourceUrl, targetUrl, type }) {
    const response = await createConnection({
      sourceUrl,
      targetUrl,
      connectionType: type,
    });
    // The webapp's call returns nothing when it fails
    if (!response) throw new Error("Couldn't create the connection");
    return response.connectionId;
  },
  async updateConnection(connectionId, { type, swap }) {
    await updateConnection({ connectionId, connectionType: type, swap });
  },
  async deleteConnection(connectionId) {
    await deleteConnection({ connectionId });
  },
  async searchLibrary(query) {
    const { cards } = await getMyUrlCards({
      limit: SEARCH_RESULTS,
      searchText: query || undefined,
    });
    return cards.map((card) => card.cardContent);
  },
  async searchEveryone(query) {
    const { urls } = await searchUrls({
      searchQuery: query,
      limit: SEARCH_RESULTS,
    });
    return urls.map((link) => ({ ...link.metadata, url: link.url }));
  },
};
