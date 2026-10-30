import { encodeUrlParam } from '@/lib/utils/link';

// Boards shown in the Library sidebar's Canvases section
export const NAV_CANVASES_LIMIT = 5;

const withSeedUrl = (href: string, seedUrl?: string) =>
  seedUrl ? `${href}?url=${encodeUrlParam(seedUrl)}` : href;

export const canvasHref = (id: string, seedUrl?: string) =>
  withSeedUrl(`/canvas/${id}`, seedUrl);

// Not prefetched: the route mints a new id each time it runs
export const NEW_CANVAS_HREF = '/canvas/new';

// Not prefetched, like NEW_CANVAS_HREF
export const linkCanvasHref = (url: string) =>
  withSeedUrl(NEW_CANVAS_HREF, url);
