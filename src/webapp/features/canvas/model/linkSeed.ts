import type { VecLike } from 'tldraw';
import type { LinkConnection } from '../server/canvasServer';
import { LINK_CARD_WIDTH, linkKey } from './linkCards';

// The most links the first ring takes. Each ring after it takes what fits.
export const FIRST_RING_SIZE = 8;

// Between the rings after the first, and the cards in them
const RING_GAP = 80;
// Between the cards of the first ring and the card in the middle, edge to edge
const FIRST_RING_GAP = 60;

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

// The least radius at which no two cards of a first ring of size, nor any of
// them and the middle card, come closer than the gap. Each card's offset from
// another grows with the radius, so each pair needs a radius of its own and
// the ring takes the largest.
function firstRingRadius(size: number, tallest: number) {
  const w = LINK_CARD_WIDTH + FIRST_RING_GAP;
  const h = tallest + FIRST_RING_GAP;
  const clearAt = (dx: number, dy: number) =>
    Math.min(
      dx === 0 ? Infinity : w / Math.abs(dx),
      dy === 0 ? Infinity : h / Math.abs(dy),
    );
  const at = ringAround({ x: 0, y: 0 }, { radius: 1, spacing: 0, size });
  let radius = 0;
  at.forEach((one, i) => {
    radius = Math.max(radius, clearAt(one.x, one.y));
    for (const other of at.slice(i + 1)) {
      radius = Math.max(radius, clearAt(one.x - other.x, one.y - other.y));
    }
  });
  return radius;
}

// The ring after previous, or the first, for up to waiting cards no taller
// than tallest: clear of each other and of the ring or card inside it
export function nextRing(
  previous: Ring | null,
  waiting: number,
  tallest: number,
): Ring {
  const spacing = ringSpacing(tallest);
  if (!previous) {
    const size = Math.min(waiting, FIRST_RING_SIZE);
    return { radius: firstRingRadius(size, tallest), spacing, size };
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
