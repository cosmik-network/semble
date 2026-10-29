import { cardKeys } from '@/features/cards/lib/cardKeys';

export const canvasKeys = {
  all: () => ['canvases'] as const,
  list: (ownerDid: string) => [...canvasKeys.all(), 'list', ownerDid] as const,
  canvas: (id: string) => [...canvasKeys.all(), 'canvas', id] as const,
  // Under cardKeys so the webapp's save and remove mutations, which invalidate
  // all of them, refresh the board's links too
  links: () => [...cardKeys.all(), 'canvas-link'] as const,
  link: (url: string) => [...canvasKeys.links(), url] as const,
  librarySearch: (query: string) =>
    [...cardKeys.all(), 'canvas-library-search', query] as const,
  // Not under cardKeys: the viewer's own saves barely change it
  sembleSearch: (query: string) =>
    [...canvasKeys.all(), 'semble-search', query] as const,
};
