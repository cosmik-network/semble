import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, inArray, desc, asc, count, SQL, sql } from 'drizzle-orm';
import {
  CardQueryOptions,
  PaginatedQueryResult,
  CardSortField,
  SortOrder,
  AnnotationCardView,
  NoteForAnnotationRawDTO,
  LibraryForAnnotationDTO,
} from '../../../domain/ICardQueryRepository';
import { CardTypeEnum } from '../../../domain/value-objects/CardType';
import { cards } from '../schema/card.sql';
import { libraryMemberships } from '../schema/libraryMembership.sql';
import { annotationSelectors } from '../schema/annotationSelector.sql';
import { publishedRecords } from '../schema/publishedRecord.sql';
import { CardMapper } from '../mappers/CardMapper';
import {
  fetchAnnotationEngagement,
  annotationEngagementKey,
} from './annotationEngagementQueries';

export class AnnotationCardQueryService {
  constructor(private db: PostgresJsDatabase) {}

  /**
   * All annotation cards made on a URL, with their selectors and note.
   */
  async getAnnotationsForUrl(
    url: string,
    options: CardQueryOptions,
  ): Promise<PaginatedQueryResult<AnnotationCardView>> {
    try {
      const { page, limit, sortBy, sortOrder } = options;
      const offset = (page - 1) * limit;
      const orderDirection = sortOrder === SortOrder.ASC ? asc : desc;

      const whereClause = and(
        eq(cards.type, CardTypeEnum.ANNOTATION),
        eq(cards.url, url),
      );

      const [rows, totalCountResult] = await Promise.all([
        this.db
          .select({
            id: cards.id,
            authorId: cards.authorId,
            url: cards.url,
            publishedRecordUri: publishedRecords.uri,
            contentData: cards.contentData,
            libraryCount: cards.libraryCount,
            createdAt: cards.createdAt,
            updatedAt: cards.updatedAt,
          })
          .from(cards)
          .leftJoin(
            publishedRecords,
            eq(cards.publishedRecordId, publishedRecords.id),
          )
          .where(whereClause)
          .orderBy(orderDirection(this.getSortColumn(sortBy)))
          .limit(limit)
          .offset(offset),
        this.db.select({ count: count() }).from(cards).where(whereClause),
      ]);

      const totalCount = totalCountResult[0]?.count || 0;
      const views = await this.assembleAnnotationViews(rows);

      return {
        items: views,
        totalCount,
        hasMore: offset + rows.length < totalCount,
      };
    } catch (error) {
      console.error('Error in getAnnotationsForUrl:', error);
      throw error;
    }
  }

  /**
   * Ids of annotation cards matching a passage: same URL and a
   * TextQuoteSelector whose normalized exact equals `exactNormalized`.
   */
  async getMatchingAnnotationCardIds(
    url: string,
    exactNormalized: string,
  ): Promise<string[]> {
    try {
      const rows = await this.db
        .select({ id: cards.id })
        .from(cards)
        .innerJoin(
          annotationSelectors,
          eq(annotationSelectors.cardId, cards.id),
        )
        .where(this.matchingConditions(url, exactNormalized));

      return rows.map((row) => row.id);
    } catch (error) {
      console.error('Error in getMatchingAnnotationCardIds:', error);
      throw error;
    }
  }

  /**
   * Note-bearing annotation cards matching a passage.
   */
  async getNotesForAnnotation(
    url: string,
    exactNormalized: string,
    options: CardQueryOptions,
  ): Promise<PaginatedQueryResult<NoteForAnnotationRawDTO>> {
    try {
      const { page, limit, sortBy, sortOrder } = options;
      const offset = (page - 1) * limit;
      const orderDirection = sortOrder === SortOrder.ASC ? asc : desc;

      const whereClause = and(
        this.matchingConditions(url, exactNormalized),
        sql`${cards.contentData}->>'note' IS NOT NULL AND ${cards.contentData}->>'note' <> ''`,
      );

      const [rows, totalCountResult] = await Promise.all([
        this.db
          .select({
            id: cards.id,
            authorId: cards.authorId,
            contentData: cards.contentData,
            createdAt: cards.createdAt,
            updatedAt: cards.updatedAt,
          })
          .from(cards)
          .innerJoin(
            annotationSelectors,
            eq(annotationSelectors.cardId, cards.id),
          )
          .where(whereClause)
          .groupBy(cards.id)
          .orderBy(orderDirection(this.getSortColumn(sortBy)))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: count() })
          .from(cards)
          .innerJoin(
            annotationSelectors,
            eq(annotationSelectors.cardId, cards.id),
          )
          .where(whereClause),
      ]);

      const totalCount = totalCountResult[0]?.count || 0;

      const items: NoteForAnnotationRawDTO[] = rows.map((row) => ({
        id: row.id,
        note: (row.contentData as { note?: string }).note ?? '',
        authorId: row.authorId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));

      return {
        items,
        totalCount,
        hasMore: offset + rows.length < totalCount,
      };
    } catch (error) {
      console.error('Error in getNotesForAnnotation:', error);
      throw error;
    }
  }

  /**
   * Library memberships of annotation cards matching a passage. A card with
   * multiple matching selectors joins the selector table once per selector,
   * so results are deduplicated on card id — but the domain only allows one
   * TextQuoteSelector per card, making this a no-op safeguard.
   */
  async getLibrariesForAnnotation(
    url: string,
    exactNormalized: string,
    options: CardQueryOptions,
  ): Promise<PaginatedQueryResult<LibraryForAnnotationDTO>> {
    try {
      const { page, limit, sortBy, sortOrder } = options;
      const offset = (page - 1) * limit;
      const orderDirection = sortOrder === SortOrder.ASC ? asc : desc;

      // LIBRARY_COUNT sorting is a no-op here: every row is a membership of a
      // matching card, so ordering falls through to the tiebreaker — same as
      // getLibrariesForUrl.
      const orderByClause =
        sortBy === CardSortField.LIBRARY_COUNT
          ? desc(cards.updatedAt)
          : orderDirection(this.getSortColumn(sortBy));

      const whereClause = and(
        this.matchingConditions(url, exactNormalized),
        sql`EXISTS (
          SELECT 1 FROM library_memberships
          WHERE library_memberships.card_id = ${cards.id}
        )`,
      );

      const [rows, totalCountResult] = await Promise.all([
        this.db
          .select({
            userId: libraryMemberships.userId,
            cardId: cards.id,
            authorId: cards.authorId,
            url: cards.url,
            publishedRecordUri: publishedRecords.uri,
            contentData: cards.contentData,
            libraryCount: cards.libraryCount,
            createdAt: cards.createdAt,
            updatedAt: cards.updatedAt,
          })
          .from(cards)
          .innerJoin(
            libraryMemberships,
            eq(libraryMemberships.cardId, cards.id),
          )
          .leftJoin(
            publishedRecords,
            eq(cards.publishedRecordId, publishedRecords.id),
          )
          .where(whereClause)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: count() })
          .from(cards)
          .innerJoin(
            libraryMemberships,
            eq(libraryMemberships.cardId, cards.id),
          )
          .where(whereClause),
      ]);

      const totalCount = totalCountResult[0]?.count || 0;
      const views = await this.assembleAnnotationViews(
        rows.map((row) => ({
          id: row.cardId,
          authorId: row.authorId,
          url: row.url,
          publishedRecordUri: row.publishedRecordUri,
          contentData: row.contentData,
          libraryCount: row.libraryCount,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        })),
      );

      const items: LibraryForAnnotationDTO[] = rows.map((row, i) => ({
        userId: row.userId,
        card: views[i]!,
      }));

      return {
        items,
        totalCount,
        hasMore: offset + rows.length < totalCount,
      };
    } catch (error) {
      console.error('Error in getLibrariesForAnnotation:', error);
      throw error;
    }
  }

  /**
   * URL of each card id; ids that don't resolve are omitted.
   */
  async getCardUrlsByIds(cardIds: string[]): Promise<Map<string, string>> {
    try {
      const urlMap = new Map<string, string>();
      if (cardIds.length === 0) {
        return urlMap;
      }

      const rows = await this.db
        .select({ id: cards.id, url: cards.url })
        .from(cards)
        .where(inArray(cards.id, cardIds));

      for (const row of rows) {
        if (row.url) {
          urlMap.set(row.id, row.url);
        }
      }
      return urlMap;
    } catch (error) {
      console.error('Error in getCardUrlsByIds:', error);
      throw error;
    }
  }

  /**
   * WHERE conditions for passage matching: ANNOTATION card on the URL with a
   * TextQuoteSelector whose exact_normalized equals the given key.
   */
  private matchingConditions(url: string, exactNormalized: string): SQL {
    return and(
      eq(cards.type, CardTypeEnum.ANNOTATION),
      eq(cards.url, url),
      eq(annotationSelectors.selectorType, 'TextQuoteSelector'),
      eq(annotationSelectors.exactNormalized, exactNormalized),
    )!;
  }

  /** Fetch selectors and map card rows to AnnotationCardView */
  private async assembleAnnotationViews(
    rows: Array<{
      id: string;
      authorId: string;
      url: string;
      publishedRecordUri: string | null;
      contentData: unknown;
      libraryCount: number;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ): Promise<AnnotationCardView[]> {
    if (rows.length === 0) {
      return [];
    }

    const cardIds = rows.map((row) => row.id);
    const selectorRows = await this.db
      .select({
        cardId: annotationSelectors.cardId,
        selectorType: annotationSelectors.selectorType,
        ordinal: annotationSelectors.ordinal,
        exact: annotationSelectors.exact,
        exactNormalized: annotationSelectors.exactNormalized,
        prefix: annotationSelectors.prefix,
        suffix: annotationSelectors.suffix,
      })
      .from(annotationSelectors)
      .where(inArray(annotationSelectors.cardId, cardIds))
      .orderBy(annotationSelectors.ordinal);

    const selectorsByCard = new Map<string, typeof selectorRows>();
    for (const selectorRow of selectorRows) {
      const list = selectorsByCard.get(selectorRow.cardId) ?? [];
      list.push(selectorRow);
      selectorsByCard.set(selectorRow.cardId, list);
    }

    // Entity-level engagement per passage — library/connection counts across
    // all matching annotation cards, not just this page's rows
    const engagementMap = await fetchAnnotationEngagement(
      this.db,
      rows
        .map((row) => {
          const selector = (selectorsByCard.get(row.id) ?? []).find(
            (s) => s.selectorType === 'TextQuoteSelector',
          );
          return selector
            ? { url: row.url, exactNormalized: selector.exactNormalized }
            : null;
        })
        .filter((key): key is { url: string; exactNormalized: string } =>
          Boolean(key),
        ),
    );

    return rows.map((row) => {
      // Entity-level counts across all cards matching this passage
      const quoteSelector = (selectorsByCard.get(row.id) ?? []).find(
        (s) => s.selectorType === 'TextQuoteSelector',
      );
      const engagement = quoteSelector
        ? engagementMap.get(
            annotationEngagementKey(row.url, quoteSelector.exactNormalized),
          )
        : undefined;

      return CardMapper.toAnnotationCardQueryResult({
        id: row.id,
        authorId: row.authorId,
        url: row.url,
        uri: row.publishedRecordUri || undefined,
        libraryCount: engagement?.libraryCount ?? row.libraryCount,
        connectionCount: engagement?.connectionCount ?? 0,
        contentData: row.contentData,
        selectors: selectorsByCard.get(row.id) ?? [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    });
  }

  private getSortColumn(sortBy: CardSortField) {
    switch (sortBy) {
      case CardSortField.CREATED_AT:
        return cards.createdAt;
      case CardSortField.UPDATED_AT:
        return cards.updatedAt;
      case CardSortField.LIBRARY_COUNT:
        return cards.libraryCount;
      default:
        return cards.updatedAt;
    }
  }
}
