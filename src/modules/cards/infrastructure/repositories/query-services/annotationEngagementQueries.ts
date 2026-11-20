import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, eq, inArray, or, countDistinct, count, SQL } from 'drizzle-orm';
import { cards } from '../schema/card.sql';
import { libraryMemberships } from '../schema/libraryMembership.sql';
import { annotationSelectors } from '../schema/annotationSelector.sql';
import { connections } from '../schema/connection.sql';
import { CardTypeEnum } from '../../../domain/value-objects/CardType';

/**
 * Entity-level engagement for an annotation passage: stats across ALL
 * annotation cards matching (url, exact_normalized), not any single card.
 *
 * - libraryCount: distinct users with any matching annotation card in their
 *   library
 * - connectionCount: connections where any matching annotation card is an
 *   endpoint (CARD-typed source or target)
 */
export interface AnnotationEngagement {
  libraryCount: number;
  connectionCount: number;
}

/** Map key for a passage: url + normalized exact text */
export function annotationEngagementKey(
  url: string,
  exactNormalized: string,
): string {
  return `${url}\u0000${exactNormalized}`;
}

/**
 * Engagement for each requested passage. Not every input key is present in
 * the result — passages with no matching cards are omitted (callers fall
 * back to card-level values or 0).
 */
export async function fetchAnnotationEngagement(
  db: PostgresJsDatabase,
  keys: Array<{ url: string; exactNormalized: string }>,
): Promise<Map<string, AnnotationEngagement>> {
  const result = new Map<string, AnnotationEngagement>();
  if (keys.length === 0) {
    return result;
  }

  const uniqueUrls = [...new Set(keys.map((key) => key.url))];
  const uniqueNormalized = [...new Set(keys.map((key) => key.exactNormalized))];

  // Distinct-library counts per (url, exact_normalized). The IN filters can
  // cross-match a url with a normalized key from another url; grouping by
  // both keeps the buckets correct and the extra rows are simply unused.
  const libraryCountsPromise = db
    .select({
      url: cards.url,
      exactNormalized: annotationSelectors.exactNormalized,
      libraryCount: countDistinct(libraryMemberships.userId),
    })
    .from(cards)
    .innerJoin(
      annotationSelectors,
      and(
        eq(annotationSelectors.cardId, cards.id),
        eq(annotationSelectors.selectorType, 'TextQuoteSelector'),
      ),
    )
    .leftJoin(libraryMemberships, eq(libraryMemberships.cardId, cards.id))
    .where(
      and(
        eq(cards.type, CardTypeEnum.ANNOTATION),
        inArray(cards.url, uniqueUrls),
        inArray(annotationSelectors.exactNormalized, uniqueNormalized),
      ),
    )
    .groupBy(cards.url, annotationSelectors.exactNormalized);

  // Matching card ids per passage, then connection counts per card id
  const matchingCardsPromise = db
    .select({
      id: cards.id,
      url: cards.url,
      exactNormalized: annotationSelectors.exactNormalized,
    })
    .from(cards)
    .innerJoin(
      annotationSelectors,
      and(
        eq(annotationSelectors.cardId, cards.id),
        eq(annotationSelectors.selectorType, 'TextQuoteSelector'),
      ),
    )
    .where(
      and(
        eq(cards.type, CardTypeEnum.ANNOTATION),
        inArray(cards.url, uniqueUrls),
        inArray(annotationSelectors.exactNormalized, uniqueNormalized),
      ),
    );

  const [libraryCounts, matchingCards] = await Promise.all([
    libraryCountsPromise,
    matchingCardsPromise,
  ]);

  const connectionCountsByCardId = await fetchCardConnectionCounts(
    db,
    matchingCards.map((card) => card.id),
  );

  for (const row of libraryCounts) {
    if (!row.url) continue;
    result.set(annotationEngagementKey(row.url, row.exactNormalized), {
      libraryCount: Number(row.libraryCount) || 0,
      connectionCount: 0,
    });
  }

  // Ensure passages whose cards all lack memberships still get an entry
  for (const card of matchingCards) {
    if (!card.url) continue;
    const key = annotationEngagementKey(card.url, card.exactNormalized);
    if (!result.has(key)) {
      result.set(key, { libraryCount: 0, connectionCount: 0 });
    }
  }

  // Sum per-card connection counts into each passage bucket
  for (const card of matchingCards) {
    if (!card.url) continue;
    const key = annotationEngagementKey(card.url, card.exactNormalized);
    const engagement = result.get(key)!;
    engagement.connectionCount += connectionCountsByCardId.get(card.id) ?? 0;
  }

  return result;
}

/**
 * Connection count per card id — connections where the card is a CARD-typed
 * source or target.
 */
export async function fetchCardConnectionCounts(
  db: PostgresJsDatabase,
  cardIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const uniqueCardIds = [...new Set(cardIds)];
  if (uniqueCardIds.length === 0) {
    return result;
  }

  const rows = await db
    .select({
      sourceCardId: connections.sourceValue,
      targetCardId: connections.targetValue,
    })
    .from(connections)
    .where(
      or(
        and(
          eq(connections.sourceType, 'CARD'),
          inArray(connections.sourceValue, uniqueCardIds),
        )!,
        and(
          eq(connections.targetType, 'CARD'),
          inArray(connections.targetValue, uniqueCardIds),
        )!,
      ) as SQL,
    );

  for (const row of rows) {
    const sourceCount = result.get(row.sourceCardId) ?? 0;
    result.set(row.sourceCardId, sourceCount + 1);
    const targetCount = result.get(row.targetCardId) ?? 0;
    result.set(row.targetCardId, targetCount + 1);
  }

  return result;
}
