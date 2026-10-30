import { encodeUrlParam } from '@/lib/utils/link';

// Recent boards listed in the Library sidebar and under "Add to a canvas"
export const RECENT_CANVASES_LIMIT = 5;

// What a board is opened from: a link's Semble page, or a collection's
export type CanvasSeed = { url: string } | { collectionId: string };

const withSeed = (href: string, seed?: CanvasSeed) => {
  if (!seed) return href;
  return 'url' in seed
    ? `${href}?url=${encodeUrlParam(seed.url)}`
    : `${href}?collection=${encodeURIComponent(seed.collectionId)}`;
};

export const canvasHref = (id: string, seed?: CanvasSeed) =>
  withSeed(`/canvas/${id}`, seed);

// Not prefetched: the route mints a new id each time it runs
export const NEW_CANVAS_HREF = '/canvas/new';

// A new board started from a link's or a collection's Semble page
export const seededCanvasHref = (seed: CanvasSeed) =>
  withSeed(NEW_CANVAS_HREF, seed);

// The dev-only stress board (#980). Fixed, so reloading opens the saved board
// rather than placing it again.
export const STRESS_CANVAS_ID = '00000000-0000-4000-8000-000000000980';
