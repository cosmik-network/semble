import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, inArray, desc, asc, count, or, SQL, sql } from 'drizzle-orm';
import {
  CardQueryOptions,
  PaginatedQueryResult,
  CardSortField,
  SortOrder,
  SearchAnnotationsOptions,
  AnnotationCardView,
  AnnotationView,
  ANNOTATION_CARDS_PREVIEW_LIMIT,
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
import {
  normalizeQuotedText,
  annotationPassageKey,
} from '../../../domain/value-objects/selectors/normalizeQuotedText';

export class AnnotationCardQueryService {
  constructor(private db: PostgresJsDatabase) {}

  /**
   * Annotations made on a URL — one entry per unique passage (url +
   * normalized exact text), not per card. Cards are grouped into passages in
   * memory (a URL's annotation cards are few), then sorted and paginated by
   * passage: createdAt is the earliest card on the passage, updatedAt its
   * most recent activity.
   */
  async getAnnotationsForUrl(
    url: string,
    options: CardQueryOptions,
  ): Promise<PaginatedQueryResult<AnnotationView>> {
    try {
      const { page, limit, sortBy, sortOrder } = options;
      const offset = (page - 1) * limit;
      const orderDirection = sortOrder === SortOrder.ASC ? asc : desc;

      // Every annotation card on the URL with its quote-selector keys
      const rows = await this.db
        .select({
          id: cards.id,
          authorId: cards.authorId,
          url: cards.url,
          publishedRecordUri: publishedRecords.uri,
          contentData: cards.contentData,
          libraryCount: cards.libraryCount,
          createdAt: cards.createdAt,
          updatedAt: cards.updatedAt,
          selectorOrdinal: annotationSelectors.ordinal,
          exactNormalized: annotationSelectors.exactNormalized,
        })
        .from(cards)
        .leftJoin(
          publishedRecords,
          eq(cards.publishedRecordId, publishedRecords.id),
        )
        .innerJoin(
          annotationSelectors,
          and(
            eq(annotationSelectors.cardId, cards.id),
            eq(annotationSelectors.selectorType, 'TextQuoteSelector'),
          ),
        )
        .where(
          and(eq(cards.type, CardTypeEnum.ANNOTATION), eq(cards.url, url)),
        );

      // Group by passage — the card's primary (lowest-ordinal) quote
      // selector's normalized exact
      const minOrdinalByCard = new Map<string, number>();
      const keyByCard = new Map<string, string>();
      for (const row of rows) {
        const existing = minOrdinalByCard.get(row.id);
        if (existing === undefined || row.selectorOrdinal < existing) {
          minOrdinalByCard.set(row.id, row.selectorOrdinal);
          keyByCard.set(row.id, row.exactNormalized ?? '');
        }
      }

      const passages = new Map<
        string,
        {
          representative: (typeof rows)[number];
          cards: (typeof rows)[number][];
          createdAt: Date;
          updatedAt: Date;
        }
      >();
      // The selector join duplicates each card once per selector row —
      // dedupe by card id when collecting a passage's cards
      const seenCards = new Set<string>();
      for (const row of rows) {
        const key = keyByCard.get(row.id) ?? '';
        let passage = passages.get(key);
        if (!passage) {
          passage = {
            representative: row,
            cards: [],
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          };
          passages.set(key, passage);
        }
        if (!seenCards.has(row.id)) {
          seenCards.add(row.id);
          passage.cards.push(row);
        }
        if (row.createdAt < passage.createdAt) {
          passage.createdAt = row.createdAt;
        }
        if (row.updatedAt > passage.updatedAt) {
          passage.updatedAt = row.updatedAt;
        }
        if (row.updatedAt > passage.representative.updatedAt) {
          passage.representative = row;
        }
      }

      // The representative card's assembled view carries the selectors and
      // the passage's entity-level counts
      const representativeViews = await this.assembleAnnotationViews(
        [...passages.values()].map((passage) => passage.representative),
      );
      const viewByCard = new Map(representativeViews.map((v) => [v.id, v]));

      const views: AnnotationView[] = [...passages.values()].map((passage) => {
        const cardView = viewByCard.get(passage.representative.id)!;
        return {
          id: cardView.id,
          url: cardView.url,
          // The representative card's primary selector is the passage key,
          // so its view CID is the passage CID
          cid: cardView.cid,
          selectors: cardView.selectors,
          libraryCount: cardView.libraryCount,
          connectionCount: cardView.connectionCount,
          createdAt: passage.createdAt,
          updatedAt: passage.updatedAt,
          // Who saved the passage and their notes — a capped preview,
          // notes first then most recently created
          annotationCards: passage.cards
            .sort((a, b) => {
              const aNote = (a.contentData as { note?: string }).note;
              const bNote = (b.contentData as { note?: string }).note;
              if (!!bNote !== !!aNote) return bNote ? 1 : -1;
              return b.createdAt.getTime() - a.createdAt.getTime();
            })
            .slice(0, ANNOTATION_CARDS_PREVIEW_LIMIT)
            .map((card) => ({
              cardId: card.id,
              userId: card.authorId,
              note: (card.contentData as { note?: string }).note,
              createdAt: card.createdAt,
            })),
        };
      });

      views.sort((a, b) => {
        const comparison =
          sortBy === CardSortField.CREATED_AT
            ? a.createdAt.getTime() - b.createdAt.getTime()
            : sortBy === CardSortField.LIBRARY_COUNT
              ? a.libraryCount - b.libraryCount
              : a.updatedAt.getTime() - b.updatedAt.getTime();
        return orderDirection === asc ? comparison : -comparison;
      });

      const totalCount = views.length;
      const pageViews = views.slice(offset, offset + limit);

      return {
        items: pageViews,
        totalCount,
        hasMore: offset + pageViews.length < totalCount,
      };
    } catch (error) {
      console.error('Error in getAnnotationsForUrl:', error);
      throw error;
    }
  }

  /**
   * A single annotation card by id, with entity-level engagement counts.
   * Null when the id doesn't resolve to an annotation card.
   */
  async getAnnotationCardById(
    cardId: string,
  ): Promise<AnnotationCardView | null> {
    try {
      const rows = await this.db
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
        .where(
          and(eq(cards.id, cardId), eq(cards.type, CardTypeEnum.ANNOTATION)),
        );

      if (rows.length === 0) {
        return null;
      }

      const views = await this.assembleAnnotationViews(rows);
      return views[0] ?? null;
    } catch (error) {
      console.error('Error in getAnnotationCardById:', error);
      throw error;
    }
  }

  /**
   * Annotation cards by ids, with entity-level engagement counts.
   */
  async getBatchAnnotationCardViews(
    cardIds: string[],
  ): Promise<Map<string, AnnotationCardView>> {
    try {
      const viewMap = new Map<string, AnnotationCardView>();
      if (cardIds.length === 0) {
        return viewMap;
      }

      const rows = await this.db
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
        .where(
          and(
            inArray(cards.id, cardIds),
            eq(cards.type, CardTypeEnum.ANNOTATION),
          ),
        );

      const views = await this.assembleAnnotationViews(rows);
      for (const view of views) {
        viewMap.set(view.id, view);
      }
      return viewMap;
    } catch (error) {
      console.error('Error in getBatchAnnotationCardViews:', error);
      throw error;
    }
  }

  /**
   * Keyword search over annotation cards: tokenized substring match over the
   * note, selector passages and the URL. Card-level results — no per-URL
   * dedup (annotations ARE the cards). Annotations carry no urlType of their
   * own, so the urlType filter resolves through the URL's URL cards.
   */
  async searchAnnotations(
    options: SearchAnnotationsOptions,
  ): Promise<PaginatedQueryResult<AnnotationCardView>> {
    try {
      const {
        searchQuery,
        page,
        limit,
        sortBy,
        sortOrder,
        urlType,
        authorDid,
      } = options;
      const offset = (page - 1) * limit;

      // Tokenized substring conditions, same semantics as URL search
      const searchConditions: SQL[] = [];
      if (searchQuery && searchQuery.trim().length > 0) {
        const searchWords = searchQuery.trim().split(/\s+/);
        for (const word of searchWords) {
          const pattern = `%${word}%`;
          searchConditions.push(
            sql`(
              ${cards.contentData}->>'note' ILIKE ${pattern} OR
              EXISTS (
                SELECT 1 FROM annotation_selectors search_selectors
                WHERE search_selectors.card_id = ${cards.id}
                  AND search_selectors.exact ILIKE ${pattern}
              ) OR
              ${cards.url} ILIKE ${pattern}
            )`,
          );
        }
      }

      const whereConditions: SQL[] = [
        eq(cards.type, CardTypeEnum.ANNOTATION),
        ...searchConditions,
      ];

      if (authorDid) {
        whereConditions.push(eq(cards.authorId, authorDid.value));
      }

      if (urlType) {
        // Resolve the urlType through the URL's URL cards — annotations
        // carry no urlType of their own
        whereConditions.push(
          sql`EXISTS (
            SELECT 1 FROM cards url_cards
            WHERE url_cards.type = 'URL'
              AND url_cards.url = ${cards.url}
              AND url_cards.url_type = ${urlType}
          )`,
        );
      }

      const whereClause = and(...whereConditions);

      const totalCountRows = await this.db
        .select({ count: count() })
        .from(cards)
        .where(whereClause);
      const totalCount = totalCountRows[0]?.count ?? 0;

      // LIBRARY_COUNT falls back to the card's own library count (entity
      // counts are already on the views via assembleAnnotationViews)
      const sortColumn =
        sortBy === CardSortField.CREATED_AT ? cards.createdAt : cards.updatedAt;
      const orderDirection = sortOrder === SortOrder.ASC ? asc : desc;
      const orderBy: SQL[] =
        sortBy === CardSortField.LIBRARY_COUNT
          ? [orderDirection(cards.libraryCount), desc(cards.updatedAt)]
          : [orderDirection(sortColumn)];

      const rows = await this.db
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
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset);

      const items = await this.assembleAnnotationViews(rows);

      return {
        items,
        totalCount,
        hasMore: offset + items.length < totalCount,
      };
    } catch (error) {
      console.error('Error in searchAnnotations:', error);
      throw error;
    }
  }

  /**
   * Annotation cards grouped by passage, for resolving vector-search hits
   * back to domain objects. Map keys are `annotationPassageKey(url,
   * exactNormalized)`; only requested passages with at least one card are
   * present.
   */
  async getAnnotationCardsByPassages(
    passages: { url: string; exactNormalized: string }[],
  ): Promise<Map<string, AnnotationCardView[]>> {
    try {
      const viewMap = new Map<string, AnnotationCardView[]>();
      if (passages.length === 0) {
        return viewMap;
      }

      // Dedupe passages — one OR branch per unique key
      const seenKeys = new Set<string>();
      const uniquePassages = passages.filter((passage) => {
        const key = annotationPassageKey(passage.url, passage.exactNormalized);
        if (seenKeys.has(key)) {
          return false;
        }
        seenKeys.add(key);
        return true;
      });

      const rows = await this.db
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
        .where(
          or(
            ...uniquePassages.map((passage) =>
              this.matchingConditions(passage.url, passage.exactNormalized),
            ),
          ),
        );

      const views = await this.assembleAnnotationViews(rows);
      for (const view of views) {
        // Recompute the passage key with the canonical normalizer — same
        // function that produced the stored exact_normalized at write time
        const quoteSelector = view.selectors.find(
          (selector) => selector.type === 'TextQuoteSelector',
        );
        if (!quoteSelector) {
          continue;
        }
        const key = annotationPassageKey(
          view.url,
          normalizeQuotedText(quoteSelector.exact),
        );
        const list = viewMap.get(key) ?? [];
        list.push(view);
        viewMap.set(key, list);
      }
      return viewMap;
    } catch (error) {
      console.error('Error in getAnnotationCardsByPassages:', error);
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
        .where(this.matchingConditions(url, exactNormalized));

      return rows.map((row) => row.id);
    } catch (error) {
      console.error('Error in getMatchingAnnotationCardIds:', error);
      throw error;
    }
  }

  /**
   * Resolve a passage's annotation CID back to its parts. The CID is a hash,
   * so resolution reads the denormalized annotation_cid column on
   * annotation_selectors.
   */
  async getAnnotationPassageByCid(cid: string): Promise<{
    url: string;
    exactNormalized: string;
    exact: string;
  } | null> {
    try {
      const rows = await this.db
        .select({
          url: cards.url,
          exactNormalized: annotationSelectors.exactNormalized,
          exact: annotationSelectors.exact,
        })
        .from(annotationSelectors)
        .innerJoin(cards, eq(annotationSelectors.cardId, cards.id))
        .where(eq(annotationSelectors.annotationCid, cid))
        .limit(1);

      const row = rows[0];
      if (!row?.url) {
        return null;
      }
      return {
        url: row.url,
        exactNormalized: row.exactNormalized,
        exact: row.exact,
      };
    } catch (error) {
      console.error('Error in getAnnotationPassageByCid:', error);
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
          .where(whereClause)
          .groupBy(cards.id)
          .orderBy(orderDirection(this.getSortColumn(sortBy)))
          .limit(limit)
          .offset(offset),
        this.db.select({ count: count() }).from(cards).where(whereClause),
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
   * Library memberships of annotation cards matching a passage. Matching is
   * an EXISTS subquery (see matchingConditions), so no selector join — and
   * no row multiplication — here.
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
  /**
   * Passage match: an ANNOTATION card on `url` with a TextQuoteSelector whose
   * normalized exact equals `exactNormalized`. Self-contained (EXISTS, no
   * annotation_selectors join required) so callers that don't select selector
   * columns don't need the join — and cards with several matching selector
   * rows don't multiply results.
   */
  private matchingConditions(url: string, exactNormalized: string): SQL {
    return and(
      eq(cards.type, CardTypeEnum.ANNOTATION),
      eq(cards.url, url),
      sql`EXISTS (
        SELECT 1 FROM annotation_selectors matching_selectors
        WHERE matching_selectors.card_id = ${cards.id}
          AND matching_selectors.selector_type = 'TextQuoteSelector'
          AND matching_selectors.exact_normalized = ${exactNormalized}
      )`,
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
