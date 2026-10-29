import type { ConnectionType } from '@semble/types';
import type { LinkConnection } from '../server/canvasServer';
import { linkKey } from './linkCards';

export interface FetchedConnections {
  connections: LinkConnection[];
  fetchedAt: number;
}

export interface ArrowsInput {
  copies: Map<string, string[]>;
  // Each link's connections, for links fetched at least once
  links: Map<string, FetchedConnections>;
  viewerDid: string;
}

export interface BoardArrowSpec {
  // Deterministic, so the same refresh twice finds the arrow already there
  key: string;
  connectionId: string;
  type: ConnectionType | null;
  // Made by the viewer, rather than a ghost
  own: boolean;
  fromCopy: string;
  toCopy: string;
}

const ARROW_KEY_PREFIX = 'arrow:';

const arrowKey = (connectionId: string, from: string, to: string) =>
  `${ARROW_KEY_PREFIX}${connectionId}:${from}:${to}`;

export const isArrowKey = (key: string) => key.startsWith(ARROW_KEY_PREFIX);

const keyOf = (url: string) => linkKey(url) ?? url;

// The arrows that should be on the board: one per pair of copies a connection
// joins. A connection shows only while every end fetched lists it, so one
// deleted elsewhere goes as soon as either end is refreshed.
export function reconcileArrows(input: ArrowsInput): BoardArrowSpec[] {
  const copies = new Map(
    Array.from(input.copies, ([url, ids]) => [keyOf(url), ids]),
  );
  const links = new Map(
    Array.from(input.links, ([url, fetched]) => [keyOf(url), fetched]),
  );

  // Each connection as the most recently fetched end has it
  const latest = new Map<string, { connection: LinkConnection; at: number }>();
  for (const { connections, fetchedAt } of Array.from(links.values())) {
    for (const connection of connections) {
      const seen = latest.get(connection.id);
      if (!seen || seen.at < fetchedAt) {
        latest.set(connection.id, { connection, at: fetchedAt });
      }
    }
  }

  const arrows: BoardArrowSpec[] = [];
  for (const { connection } of Array.from(latest.values())) {
    const source = keyOf(connection.sourceUrl);
    const target = keyOf(connection.targetUrl);
    if (source === target) continue;
    const listedByEveryEnd = [source, target].every((url) => {
      const fetched = links.get(url);
      return (
        !fetched || fetched.connections.some(({ id }) => id === connection.id)
      );
    });
    if (!listedByEveryEnd) continue;
    for (const fromCopy of copies.get(source) ?? []) {
      for (const toCopy of copies.get(target) ?? []) {
        arrows.push({
          key: arrowKey(connection.id, fromCopy, toCopy),
          connectionId: connection.id,
          type: connection.type,
          own: connection.curatorId === input.viewerDid,
          fromCopy,
          toCopy,
        });
      }
    }
  }
  return arrows;
}
