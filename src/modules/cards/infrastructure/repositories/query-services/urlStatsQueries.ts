import { and, count, countDistinct, eq, inArray, or, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { cards } from '../schema/card.sql';
import { collectionCards } from '../schema/collection.sql';
import { libraryMemberships } from '../schema/libraryMembership.sql';
import { connections } from '../schema/connection.sql';
import { CardTypeEnum } from '../../../domain/value-objects/CardType';
import { ConnectionTypeEnum } from '../../../domain/value-objects/ConnectionType';
import {
  UrlConnectionCounts,
  UrlStats,
} from '../../../domain/ICardQueryRepository';

/**
 * Shared URL aggregate queries. These are the single definitions of each URL
 * count; see UrlStats in ICardQueryRepository for semantics. All functions are
 * batch (one round trip regardless of how many URLs) and match URLs exactly.
 */

// Engagement subset embedded in card views (no note/collection counts)
export interface UrlEngagement {
  urlLibraryCount: number;
  urlConnectionCount: number;
  urlInLibrary?: boolean;
  urlIsConnected?: boolean;
}

function toCountMap(rows: { url: string | null; count: number }[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.url) map.set(row.url, Number(row.count));
  }
  return map;
}

// Distinct users who have a URL card for each URL in their library
export async function fetchUrlLibraryCounts(
  db: PostgresJsDatabase,
  urls: string[],
): Promise<Map<string, number>> {
  if (urls.length === 0) return new Map();
  const rows = await db
    .select({
      url: cards.url,
      count: countDistinct(libraryMemberships.userId),
    })
    .from(cards)
    .innerJoin(libraryMemberships, eq(cards.id, libraryMemberships.cardId))
    .where(and(eq(cards.type, CardTypeEnum.URL), inArray(cards.url, urls)))
    .groupBy(cards.url);
  return toCountMap(rows);
}

// NOTE cards whose url is each URL
export async function fetchUrlNoteCounts(
  db: PostgresJsDatabase,
  urls: string[],
): Promise<Map<string, number>> {
  if (urls.length === 0) return new Map();
  const rows = await db
    .select({ url: cards.url, count: count() })
    .from(cards)
    .where(and(eq(cards.type, CardTypeEnum.NOTE), inArray(cards.url, urls)))
    .groupBy(cards.url);
  return toCountMap(rows);
}

// Distinct collections containing a URL card for each URL
export async function fetchUrlCollectionCounts(
  db: PostgresJsDatabase,
  urls: string[],
): Promise<Map<string, number>> {
  if (urls.length === 0) return new Map();
  const rows = await db
    .select({
      url: cards.url,
      count: countDistinct(collectionCards.collectionId),
    })
    .from(collectionCards)
    .innerJoin(cards, eq(collectionCards.cardId, cards.id))
    .where(and(eq(cards.type, CardTypeEnum.URL), inArray(cards.url, urls)))
    .groupBy(cards.url);
  return toCountMap(rows);
}

export function emptyUrlConnectionCounts(): UrlConnectionCounts {
  return {
    forwardTotal: 0,
    backwardTotal: 0,
    forwardByType: new Map(),
    backwardByType: new Map(),
  };
}

// URL↔URL connection counts by direction and type, in a single query
export async function fetchUrlConnectionCounts(
  db: PostgresJsDatabase,
  urls: string[],
): Promise<Map<string, UrlConnectionCounts>> {
  const result = new Map<string, UrlConnectionCounts>();
  if (urls.length === 0) return result;

  const forward = db
    .select({
      direction: sql<string>`'forward'`.as('direction'),
      url: connections.sourceValue,
      connectionType: connections.connectionType,
      count: count(),
    })
    .from(connections)
    .where(
      and(
        eq(connections.sourceType, 'URL'),
        eq(connections.targetType, 'URL'),
        inArray(connections.sourceValue, urls),
      ),
    )
    .groupBy(connections.sourceValue, connections.connectionType);

  const backward = db
    .select({
      direction: sql<string>`'backward'`.as('direction'),
      url: connections.targetValue,
      connectionType: connections.connectionType,
      count: count(),
    })
    .from(connections)
    .where(
      and(
        eq(connections.sourceType, 'URL'),
        eq(connections.targetType, 'URL'),
        inArray(connections.targetValue, urls),
      ),
    )
    .groupBy(connections.targetValue, connections.connectionType);

  const rows = await forward.unionAll(backward);

  for (const row of rows) {
    let counts = result.get(row.url);
    if (!counts) {
      counts = emptyUrlConnectionCounts();
      result.set(row.url, counts);
    }
    const n = Number(row.count);
    const type = row.connectionType as ConnectionTypeEnum | null;
    if (row.direction === 'forward') {
      counts.forwardTotal += n;
      if (type) counts.forwardByType.set(type, n);
    } else {
      counts.backwardTotal += n;
      if (type) counts.backwardByType.set(type, n);
    }
  }
  return result;
}

// Of the given URLs, the subset the user has saved as URL cards.
// Served by cards_author_url_idx (author_id, url).
export async function fetchUrlsSavedByUser(
  db: PostgresJsDatabase,
  userId: string,
  urls: string[],
): Promise<Set<string>> {
  if (urls.length === 0) return new Set();
  const rows = await db
    .selectDistinct({ url: cards.url })
    .from(cards)
    .where(
      and(
        eq(cards.authorId, userId),
        eq(cards.type, CardTypeEnum.URL),
        inArray(cards.url, urls),
      ),
    );
  return new Set(rows.map((row) => row.url as string));
}

// Of the given URLs, the subset the user has a URL↔URL connection with
export async function fetchUrlsConnectedByUser(
  db: PostgresJsDatabase,
  userId: string,
  urls: string[],
): Promise<Set<string>> {
  if (urls.length === 0) return new Set();
  const rows = await db
    .select({
      sourceValue: connections.sourceValue,
      targetValue: connections.targetValue,
    })
    .from(connections)
    .where(
      and(
        eq(connections.curatorId, userId),
        eq(connections.sourceType, 'URL'),
        eq(connections.targetType, 'URL'),
        or(
          inArray(connections.sourceValue, urls),
          inArray(connections.targetValue, urls),
        ),
      ),
    );
  const requested = new Set(urls);
  const connected = new Set<string>();
  for (const row of rows) {
    if (requested.has(row.sourceValue)) connected.add(row.sourceValue);
    if (requested.has(row.targetValue)) connected.add(row.targetValue);
  }
  return connected;
}

/**
 * Library count, connection total and caller flags for each URL. Used to
 * enrich card views. Every input URL is present in the result.
 */
export async function fetchUrlEngagement(
  db: PostgresJsDatabase,
  urls: string[],
  callingUserId?: string,
): Promise<Map<string, UrlEngagement>> {
  const uniqueUrls = [...new Set(urls)];
  const [libraryCounts, connectionCounts, savedUrls, connectedUrls] =
    await Promise.all([
      fetchUrlLibraryCounts(db, uniqueUrls),
      fetchUrlConnectionCounts(db, uniqueUrls),
      callingUserId
        ? fetchUrlsSavedByUser(db, callingUserId, uniqueUrls)
        : undefined,
      callingUserId
        ? fetchUrlsConnectedByUser(db, callingUserId, uniqueUrls)
        : undefined,
    ]);

  const result = new Map<string, UrlEngagement>();
  for (const url of uniqueUrls) {
    const connectionsForUrl = connectionCounts.get(url);
    result.set(url, {
      urlLibraryCount: libraryCounts.get(url) ?? 0,
      urlConnectionCount: connectionsForUrl
        ? connectionsForUrl.forwardTotal + connectionsForUrl.backwardTotal
        : 0,
      urlInLibrary: savedUrls?.has(url),
      urlIsConnected: connectedUrls?.has(url),
    });
  }
  return result;
}

/** Full canonical stats for each URL. Every input URL is present. */
export async function fetchUrlStats(
  db: PostgresJsDatabase,
  urls: string[],
  callingUserId?: string,
): Promise<Map<string, UrlStats>> {
  const uniqueUrls = [...new Set(urls)];
  const [
    libraryCounts,
    noteCounts,
    collectionCounts,
    connectionCounts,
    savedUrls,
    connectedUrls,
  ] = await Promise.all([
    fetchUrlLibraryCounts(db, uniqueUrls),
    fetchUrlNoteCounts(db, uniqueUrls),
    fetchUrlCollectionCounts(db, uniqueUrls),
    fetchUrlConnectionCounts(db, uniqueUrls),
    callingUserId
      ? fetchUrlsSavedByUser(db, callingUserId, uniqueUrls)
      : undefined,
    callingUserId
      ? fetchUrlsConnectedByUser(db, callingUserId, uniqueUrls)
      : undefined,
  ]);

  const result = new Map<string, UrlStats>();
  for (const url of uniqueUrls) {
    result.set(url, {
      libraryCount: libraryCounts.get(url) ?? 0,
      noteCount: noteCounts.get(url) ?? 0,
      collectionCount: collectionCounts.get(url) ?? 0,
      connections: connectionCounts.get(url) ?? emptyUrlConnectionCounts(),
      urlInLibrary: savedUrls?.has(url),
      urlIsConnected: connectedUrls?.has(url),
    });
  }
  return result;
}
