import { cardKeys } from '@/features/cards/lib/cardKeys';

export const canvasKeys = {
  all: () => ['canvases'] as const,
  list: (ownerDid: string) => [...canvasKeys.all(), 'list', ownerDid] as const,
  canvas: (id: string) => [...canvasKeys.all(), 'canvas', id] as const,
  // Under cardKeys so the webapp's save and remove mutations, which invalidate
  // all of them, refresh the board's links too
  link: (url: string) => [...cardKeys.all(), 'canvas-link', url] as const,
  librarySearch: (query: string) =>
    [...cardKeys.all(), 'canvas-library-search', query] as const,
};
