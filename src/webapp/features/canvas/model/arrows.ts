import type { ConnectionType } from '@semble/types';
import { parseCollectionPage } from '@/lib/utils/link';
import type { ConnectionNote, LinkConnection } from '../server/canvasServer';
import { linkKey } from './linkCards';

export interface FetchedConnections {
  connections: LinkConnection[];
  fetchedAt: number;
}

// The shapes a connection can end on (link copies and collection frames),
// with the URL whose connections they show. Ends whose URLs match share them.
export interface ConnectionEnd {
  url: string;
  shapeIds: string[];
}

export interface ArrowsInput {
  ends: ConnectionEnd[];
  // Each URL's connections, for URLs fetched at least once
  links: Map<string, FetchedConnections>;
  viewerDid: string;
  // Published from this tab and not yet listed by a fetch, drawn regardless
  pending: LinkConnection[];
  // Connection ids published from this tab, oldest first. They fan out after
  // the rest, so a new arrow keeps its place once the server names it.
  published: string[];
}

export interface BoardArrowSpec {
  // Deterministic, so the same refresh twice finds the arrow already there
  key: string;
  connectionId: string;
  type: ConnectionType | null;
  note: ConnectionNote | null;
  // Made by the viewer, rather than a ghost
  own: boolean;
  fromEnd: string;
  toEnd: string;
  // Fans out arrows joining the same two ends, which would otherwise overlap
  bend: number;
}

// Far enough apart for their pills not to overlap
const PARALLEL_SPACING = 48;

const ARROW_KEY_PREFIX = 'arrow:';

const arrowKey = (connectionId: string, from: string, to: string) =>
  `${ARROW_KEY_PREFIX}${connectionId}:${from}:${to}`;

export const isArrowKey = (key: string) => key.startsWith(ARROW_KEY_PREFIX);

// As the server lists a URL's connections
const fetchKey = (url: string) => linkKey(url) ?? url;
// Which ends a connection's URL joins. A collection's page matches on any host.
function endKey(url: string) {
  const page = parseCollectionPage(url);
  return page ? `collection:${page.handle}/${page.rkey}` : fetchKey(url);
}

// Each connection every fetched end lists, as the most recently fetched end
// has it
export function listedConnections(input: Map<string, FetchedConnections>) {
  const links = new Map(
    Array.from(input, ([url, fetched]) => [fetchKey(url), fetched]),
  );
  const latest = new Map<string, { connection: LinkConnection; at: number }>();
  for (const { connections, fetchedAt } of Array.from(links.values())) {
    for (const connection of connections) {
      const seen = latest.get(connection.id);
      if (!seen || seen.at < fetchedAt) {
        latest.set(connection.id, { connection, at: fetchedAt });
      }
    }
  }
  const listedByEveryEnd = (connection: LinkConnection) =>
    [connection.sourceUrl, connection.targetUrl].every((url) => {
      const fetched = links.get(fetchKey(url));
      return (
        !fetched || fetched.connections.some(({ id }) => id === connection.id)
      );
    });
  return new Map(
    Array.from(latest.values(), ({ connection }) => connection)
      .filter(listedByEveryEnd)
      .map((connection) => [connection.id, connection]),
  );
}

// The arrows that should be on the board: one per pair of ends a connection
// joins. A connection shows only while every end fetched lists it, so one
// deleted elsewhere goes as soon as either end is refreshed. The server lists
// a URL's connections by the exact URL, so only an end fetched by the URL the
// connection names rules on it: a collection page fetched on another host
// can't list it.
export function reconcileArrows(input: ArrowsInput): BoardArrowSpec[] {
  const ends = new Map<string, string[]>();
  for (const { url, shapeIds } of input.ends) {
    const key = endKey(url);
    if (!ends.has(key)) ends.set(key, []);
    ends.get(key)!.push(...shapeIds);
  }
  const listed = listedConnections(input.links);
  const shown = [
    ...Array.from(listed.values()),
    ...input.pending.filter(({ id }) => !listed.has(id)),
  ];

  const arrows: BoardArrowSpec[] = [];
  for (const connection of shown) {
    const source = endKey(connection.sourceUrl);
    const target = endKey(connection.targetUrl);
    if (source === target) continue;
    for (const fromEnd of ends.get(source) ?? []) {
      for (const toEnd of ends.get(target) ?? []) {
        arrows.push({
          key: arrowKey(connection.id, fromEnd, toEnd),
          connectionId: connection.id,
          type: connection.type,
          note: connection.note ?? null,
          own: connection.curatorId === input.viewerDid,
          fromEnd,
          toEnd,
          bend: 0,
        });
      }
    }
  }
  return fanOut(arrows, input.published);
}

// tldraw bends an arrow to its left, so one drawn the other way round between
// the same two ends is bent the opposite way to land on the same side
function fanOut(arrows: BoardArrowSpec[], published: string[]) {
  const rank = (arrow: BoardArrowSpec) => published.indexOf(arrow.connectionId);
  const byPair = new Map<string, BoardArrowSpec[]>();
  for (const arrow of arrows) {
    const pair = [arrow.fromEnd, arrow.toEnd].sort().join(' ');
    if (!byPair.has(pair)) byPair.set(pair, []);
    byPair.get(pair)!.push(arrow);
  }
  return Array.from(byPair.values()).flatMap((parallel) =>
    parallel
      .sort(
        (a, b) =>
          rank(a) - rank(b) || a.connectionId.localeCompare(b.connectionId),
      )
      .map((arrow, i) => {
        const offset = (i - (parallel.length - 1) / 2) * PARALLEL_SPACING;
        const flipped = arrow.fromEnd > arrow.toEnd;
        return { ...arrow, bend: flipped ? -offset : offset };
      }),
  );
}
