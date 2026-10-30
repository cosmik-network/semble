import type { AppBskyFeedDefs } from '@atproto/api';
import type { UrlMetadata } from '@semble/types';
import type {
  CanvasServer,
  CollectionEntry,
  CollectionInfo,
  ConnectionChange,
  LinkConnection,
  LinkInfo,
  NewConnection,
} from '@/features/canvas/server/canvasServer';

// Who the test boards are opened as
export const VIEWER_DID = 'did:plc:tester';

export interface ServerCall {
  method: string;
  args: unknown[];
}

export function testLink(
  url: string,
  overrides: Partial<LinkInfo> = {},
): LinkInfo {
  return {
    url,
    metadata: { url, title: `Title of ${url}` },
    saved: false,
    note: null,
    connections: [],
    ...overrides,
  };
}

// A post as the public Bluesky API returns it, by an author with no labels
export function testPost(
  overrides: Partial<AppBskyFeedDefs.PostView> & { text?: string } = {},
): AppBskyFeedDefs.PostView {
  const { text = 'What the post says', ...post } = overrides;
  return {
    $type: 'app.bsky.feed.defs#postView',
    uri: 'at://did:plc:poster/app.bsky.feed.post/3kpost',
    cid: 'bafypost',
    author: {
      did: 'did:plc:poster',
      handle: 'poster.bsky.social',
      displayName: 'A Poster',
      avatar: 'https://cdn.bsky.app/img/avatar/plain/did:plc:poster/a@jpeg',
    },
    record: {
      $type: 'app.bsky.feed.post',
      text,
      createdAt: '2026-10-01T00:00:00.000Z',
    },
    indexedAt: '2026-10-01T00:00:00.000Z',
    labels: [],
    ...post,
  };
}

// A collection and its entries, most recent first
export interface TestCollection {
  collection: CollectionInfo;
  entries: CollectionEntry[];
}

export function testCollection(
  overrides: Partial<CollectionInfo> & { entries?: CollectionEntry[] } = {},
): TestCollection {
  const { entries = [], ...collection } = overrides;
  return {
    collection: {
      id: 'collection-1',
      handle: 'curator.bsky.social',
      rkey: '3kcollection',
      name: 'Climate reading',
      description: null,
      open: false,
      author: {
        id: 'did:plc:curator',
        name: 'A Curator',
        handle: 'curator.bsky.social',
      },
      cardCount: entries.length,
      updatedAt: '2026-10-01T00:00:00.000Z',
      ...collection,
    },
    entries,
  };
}

function linksMatching(links: UrlMetadata[], query: string) {
  return links.filter((link) =>
    `${link.title} ${link.url}`.toLowerCase().includes(query.toLowerCase()),
  );
}

export class FakeServer implements CanvasServer {
  calls: ServerCall[] = [];
  // What the server returns for each link; others load with a title only
  links = new Map<string, LinkInfo>();
  // Every connection, whoever made it. Each link returns those it's an end of.
  connections: LinkConnection[] = [];
  // The viewer's library, most recent first
  library: UrlMetadata[] = [];
  // Links saved by anyone on Semble
  everyone: UrlMetadata[] = [];
  // Each collection by id
  collections = new Map<string, TestCollection>();
  // getLinks fails while set, as when the network is down
  failing = false;
  // Links load without their connections while set
  connectionsFailing = false;
  private held: (() => void)[] | null = null;
  private connectionsCreated = 0;

  // Responses wait until the returned function is called
  holdResponses() {
    const held: (() => void)[] = [];
    this.held = held;
    return () => {
      this.held = null;
      held.forEach((respond) => respond());
    };
  }

  async getLinks(urls: string[]) {
    this.calls.push({ method: 'getLinks', args: [urls] });
    // Answered as things stood when asked, however long the response is held
    const failing = this.failing;
    const connectionsFailing = this.connectionsFailing;
    const links = new Map(
      urls.map((url) => [
        url,
        {
          ...(this.links.get(url) ?? testLink(url)),
          connections: connectionsFailing
            ? null
            : this.connections.filter(
                (connection) =>
                  connection.sourceUrl === url || connection.targetUrl === url,
              ),
        },
      ]),
    );
    const held = this.held;
    if (held) await new Promise<void>((respond) => held.push(respond));
    if (failing) throw new Error('Network down');
    return links;
  }

  async getCollection(
    collectionId: string,
    { page, limit }: { page: number; limit: number },
  ) {
    this.calls.push({
      method: 'getCollection',
      args: [collectionId, { page, limit }],
    });
    const failing = this.failing;
    const held = this.held;
    if (held) await new Promise<void>((respond) => held.push(respond));
    if (failing) throw new Error('Network down');
    const found = this.collections.get(collectionId);
    if (!found) throw new Error('Collection not found');
    const start = (page - 1) * limit;
    return {
      collection: { ...found.collection, cardCount: found.entries.length },
      entries: found.entries.slice(start, start + limit),
      hasMore: start + limit < found.entries.length,
    };
  }

  async createConnection(connection: NewConnection) {
    this.calls.push({ method: 'createConnection', args: [connection] });
    if (this.failing) throw new Error('Network down');
    const id = `new-${++this.connectionsCreated}`;
    this.connections = [
      ...this.connections,
      {
        id,
        type: connection.type,
        sourceUrl: connection.sourceUrl,
        targetUrl: connection.targetUrl,
        curatorId: VIEWER_DID,
      },
    ];
    return id;
  }

  async updateConnection(connectionId: string, change: ConnectionChange) {
    this.calls.push({
      method: 'updateConnection',
      args: [connectionId, change],
    });
    if (this.failing) throw new Error('Network down');
    this.connections = this.connections.map((connection) => {
      if (connection.id !== connectionId) return connection;
      const type = change.type ?? connection.type;
      return change.swap
        ? {
            ...connection,
            type,
            sourceUrl: connection.targetUrl,
            targetUrl: connection.sourceUrl,
          }
        : { ...connection, type };
    });
  }

  async deleteConnection(connectionId: string) {
    this.calls.push({ method: 'deleteConnection', args: [connectionId] });
    if (this.failing) throw new Error('Network down');
    this.connections = this.connections.filter(
      (connection) => connection.id !== connectionId,
    );
  }

  async searchLibrary(query: string) {
    this.calls.push({ method: 'searchLibrary', args: [query] });
    return linksMatching(this.library, query);
  }

  async searchEveryone(query: string) {
    this.calls.push({ method: 'searchEveryone', args: [query] });
    return linksMatching(this.everyone, query);
  }
}
