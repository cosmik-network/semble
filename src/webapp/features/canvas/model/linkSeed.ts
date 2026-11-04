import type { VecLike } from 'tldraw';
import type { LinkConnection } from '../server/canvasServer';
import { LINK_CARD_WIDTH, linkKey } from './linkCards';

// The most links the first ring takes. Each ring after it takes what fits.
export const FIRST_RING_SIZE = 12;

// Between the cards in a ring, between rings, and round the middle card
const RING_GAP = 80;

// A ring of cards round the middle card, centre to centre
export interface Ring {
  radius: number;
  // The least distance kept between the cards in it and the ring inside it
  spacing: number;
  size: number;
}

// The other end of each of the link's connections, once each, in the order
// the server gave them
export function connectedUrls(
  url: string,
  connections: LinkConnection[],
): string[] {
  const urls = new Set<string>();
  for (const connection of connections) {
    const source = linkKey(connection.sourceUrl);
    const target = linkKey(connection.targetUrl);
    if (source === url && target && target !== url) urls.add(target);
    if (target === url && source && source !== url) urls.add(source);
  }
  return Array.from(urls);
}

// Cards whose centres are a diagonal of the tallest card apart can't touch,
// whichever way they lie
export function ringSpacing(tallest: number) {
  return Math.hypot(LINK_CARD_WIDTH, tallest) + RING_GAP;
}

// The ring after previous, or the first, for up to waiting cards: a spacing
// apart from each other and from the ring inside it
export function nextRing(
  previous: Ring | null,
  waiting: number,
  spacing: number,
): Ring {
  if (!previous) {
    const size = Math.min(waiting, FIRST_RING_SIZE);
    const radius =
      size < 2
        ? spacing
        : Math.max(spacing, spacing / (2 * Math.sin(Math.PI / size)));
    return { radius, spacing, size };
  }
  const kept = Math.max(previous.spacing, spacing);
  const radius = previous.radius + kept;
  const fits = Math.floor(Math.PI / Math.asin(kept / (2 * radius)));
  return { radius, spacing: kept, size: Math.min(waiting, fits) };
}

// Where to centre each card of the ring round middle: clockwise from the top
// and spaced evenly
export function ringAround(middle: VecLike, ring: Ring): VecLike[] {
  return Array.from({ length: ring.size }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / ring.size;
    return {
      x: middle.x + ring.radius * Math.cos(angle),
      y: middle.y + ring.radius * Math.sin(angle),
    };
  });
}
