import type { UrlMetadata } from '@semble/types';
import type {
  CanvasServer,
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

export class FakeServer implements CanvasServer {
  calls: ServerCall[] = [];
  // What the server returns for each link; others load with a title only
  links = new Map<string, LinkInfo>();
  // Every connection, whoever made it. Each link returns those it's an end of.
  connections: LinkConnection[] = [];
  // The viewer's library, most recent first
  library: UrlMetadata[] = [];
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
    return this.library.filter((link) =>
      `${link.title} ${link.url}`.toLowerCase().includes(query.toLowerCase()),
    );
  }
}
