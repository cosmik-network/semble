import type { ConnectionType } from '@semble/types';
import { ConnectionTypeSchema } from '@semble/types';
import { LINK_CARD_WIDTH } from '../model/linkCards';
import type { LinkConnection, LinkInfo } from '../server/canvasServer';

const COLUMNS = 25;
const COLUMN_GAP = 80;
// Taller than any card, so rows never overlap
const ROW_HEIGHT = 600;
// Each card connects to the next, the two below it and one far away
const OFFSETS = [1, COLUMNS, COLUMNS + 1, 97];

// The size the spec checks performance at (#980): 500 cards, 2,000 arrows
export const STRESS_CARDS = 500;
export const STRESS_ARROWS = STRESS_CARDS * OFFSETS.length;
const OTHER_CURATOR = 'did:plc:stress-curator';
const TYPES: ConnectionType[] = ConnectionTypeSchema.options;

const urlOf = (i: number) => `https://stress.example.com/links/${i}`;

const WORDS =
  'canvas link climate reading graph tldraw arrow card collection note semble research paper idea source'.split(
    ' ',
  );
const wordsFrom = (i: number, count: number) =>
  Array.from(
    { length: count },
    (_, k) => WORDS[(i * 7 + k * 3) % WORDS.length],
  ).join(' ');

function connectionsOf(viewerDid: string): LinkConnection[] {
  return Array.from({ length: STRESS_ARROWS }, (_, n) => {
    const source = n % STRESS_CARDS;
    const offset = OFFSETS[Math.floor(n / STRESS_CARDS)];
    return {
      id: `stress-connection-${n}`,
      type: TYPES[n % TYPES.length],
      sourceUrl: urlOf(source),
      targetUrl: urlOf((source + offset) % STRESS_CARDS),
      curatorId: n % 2 === 0 ? viewerDid : OTHER_CURATOR,
    };
  });
}

// What a fake server returns for each link: a mix of cards with and without
// images and notes, and the connections that touch it
export function stressLinks(viewerDid: string): Map<string, LinkInfo> {
  const touching = new Map<string, LinkConnection[]>();
  for (const connection of connectionsOf(viewerDid)) {
    for (const url of [connection.sourceUrl, connection.targetUrl]) {
      touching.set(url, [...(touching.get(url) ?? []), connection]);
    }
  }
  const author = {
    id: viewerDid,
    name: 'Stress Tester',
    handle: 'stress.test',
  };

  return new Map(
    Array.from({ length: STRESS_CARDS }, (_, i): [string, LinkInfo] => {
      const url = urlOf(i);
      return [
        url,
        {
          url,
          metadata: {
            url,
            title: `${i}: ${wordsFrom(i, 4 + (i % 9))}`,
            description:
              i % 3 === 0 ? undefined : wordsFrom(i + 1, 10 + (i % 25)),
            siteName: 'Stress Example',
            imageUrl:
              i % 4 === 3
                ? undefined
                : `https://picsum.photos/seed/semble-${i}/600/315`,
          },
          saved: i % 2 === 0,
          note:
            i % 5 === 0
              ? { id: `stress-note-${i}`, text: wordsFrom(i + 2, 20), author }
              : null,
          connections: touching.get(url) ?? [],
        },
      ];
    }),
  );
}

// Top-left corners in a grid, one link each
export function stressPlacements() {
  return Array.from({ length: STRESS_CARDS }, (_, i) => ({
    url: urlOf(i),
    x: (i % COLUMNS) * (LINK_CARD_WIDTH + COLUMN_GAP),
    y: Math.floor(i / COLUMNS) * ROW_HEIGHT,
  }));
}
