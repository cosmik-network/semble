import { getCardFromMyLibrary, getUrlMetadata } from '@/features/cards/lib/dal';
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

async function getLink(url: string): Promise<LinkInfo> {
  const [{ metadata }, { card }] = await Promise.all([
    getUrlMetadata({ url }),
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
};
