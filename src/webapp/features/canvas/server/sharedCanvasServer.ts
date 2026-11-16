import { getUrlMetadata } from '@/features/cards/lib/dal';
import { getConnectionsForUrl } from '@/features/connections/lib/dal';
import { getBlueskyPost } from '@/features/platforms/bluesky/lib/dal';
import { getPostUriFromUrl } from '@/lib/utils/atproto';
import { detectUrlPlatform, SupportedPlatform } from '@/lib/utils/link';
import { AppBskyFeedDefs } from '@atproto/api';
import type { ConnectionType } from '@semble/types';
import { apiCanvasServer } from './apiCanvasServer';
import type { CanvasServer, LinkConnection, LinkInfo } from './canvasServer';

function isPostLink(url: string) {
  const platform = detectUrlPlatform(url).type;
  return (
    platform === SupportedPlatform.BLUESKY_POST ||
    platform === SupportedPlatform.BLACKSKY_POST
  );
}

// A shared board's viewer is anonymous: only the public endpoints are called,
// so no viewer-specific state (saved, note) is fetched
async function getLink(url: string): Promise<LinkInfo> {
  const [metadata, connections, post] = await Promise.all([
    getUrlMetadata({ url }).then(({ metadata }) => metadata),
    getConnectionsForUrl({ url, direction: 'both', page: 1, limit: 100 })
      .then((response) => {
        const links: LinkConnection[] = [];
        for (const { connection, source, target } of response.connections) {
          links.push({
            id: connection.id,
            type: (connection.type as ConnectionType | undefined) ?? null,
            sourceUrl: source.url,
            targetUrl: target.url,
            curatorId: connection.curator.id,
            note: connection.note
              ? { text: connection.note, author: connection.curator }
              : null,
          });
        }
        return links;
      })
      .catch((error) => {
        // The card still shows if its connections don't load
        console.warn(error);
        return null;
      }),
    isPostLink(url)
      ? getBlueskyPost(getPostUriFromUrl(url)).then((data) => {
          const thread = data?.thread;
          return thread && AppBskyFeedDefs.isThreadViewPost(thread)
            ? thread.post
            : null;
        })
      : null,
  ]);
  return {
    url,
    metadata,
    saved: false,
    note: null,
    connections,
    post,
  };
}

// The view-only twin of apiCanvasServer: reads through public endpoints,
// reusing the API server for collections, and refusing every write
export const sharedCanvasServer: CanvasServer = {
  async getLinks(urls) {
    const links = new Map<string, LinkInfo>();
    await Promise.all(
      urls.map((url) =>
        getLink(url).then(
          (link) => links.set(url, link),
          (error) => console.warn(error),
        ),
      ),
    );
    return links;
  },
  getCollection: (collectionId, page) =>
    apiCanvasServer.getCollection(collectionId, page),
  getCollectionAt: (address, page) =>
    apiCanvasServer.getCollectionAt(address, page),
  async createConnection() {
    throw new Error("A shared canvas can't be edited");
  },
  async updateConnection() {
    throw new Error("A shared canvas can't be edited");
  },
  async deleteConnection() {
    throw new Error("A shared canvas can't be edited");
  },
  async searchLibrary() {
    return [];
  },
  async searchEveryone() {
    return [];
  },
};
