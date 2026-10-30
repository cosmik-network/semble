import type { CanvasServer, LinkInfo } from '../server/canvasServer';
import { stressLinks } from './stressData';

// Answers from memory, so the stress board runs the real controller without
// touching the API. Writes succeed and change nothing.
export function stressCanvasServer(viewerDid: string): CanvasServer {
  const links = stressLinks(viewerDid);
  let created = 0;

  return {
    async getLinks(urls) {
      return new Map(
        urls.flatMap((url): [string, LinkInfo][] => {
          const link = links.get(url);
          return link ? [[url, link]] : [];
        }),
      );
    },
    searchLibrary: async () => [],
    searchEveryone: async () => [],
    async getCollection() {
      throw new Error('The stress board has no collections');
    },
    createConnection: async () => `stress-created-${++created}`,
    updateConnection: async () => {},
    deleteConnection: async () => {},
  };
}
