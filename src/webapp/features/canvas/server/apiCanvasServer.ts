import {
  getCardFromMyLibrary,
  getMyUrlCards,
  getUrlMetadata,
} from '@/features/cards/lib/dal';
import type { UrlMetadata } from '@semble/types';
import type { CanvasServer, LinkInfo } from './canvasServer';

// Until a batch endpoint exists (#982), each link takes two calls
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

async function getLink(url: string): Promise<LinkInfo> {
  const [metadata, { card }] = await Promise.all([
    getMetadata(url),
    getCardFromMyLibrary(url),
  ]);
  return {
    url,
    metadata,
    saved: !!card,
    note: card?.note ? { ...card.note, author: card.author } : null,
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
