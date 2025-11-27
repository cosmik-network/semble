import { eq, desc, asc, count, countDistinct, inArray, and } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  CardQueryOptions,
  PaginatedQueryResult,
  CollectionCardQueryResultDTO,
  CardSortField,
  SortOrder,
} from '../../../domain/ICardQueryRepository';
import { cards } from '../schema/card.sql';
import { collections, collectionCards } from '../schema/collection.sql';
import { libraryMemberships } from '../schema/libraryMembership.sql';
import { CardMapper } from '../mappers/CardMapper';
import { CardTypeEnum } from '../../../domain/value-objects/CardType';

export class CollectionCardQueryService {
  constructor(private db: PostgresJsDatabase) {}

  async getCardsInCollection(
    collectionId: string,
    options: CardQueryOptions,
    callingUserId?: string,
  ): Promise<PaginatedQueryResult<CollectionCardQueryResultDTO>> {
    try {
      const { page, limit, sortBy, sortOrder } = options;
      const offset = (page - 1) * limit;

      // Build the sort order
      const orderDirection = sortOrder === SortOrder.ASC ? asc : desc;

      // First, get the collection to know its author
      const collectionQuery = this.db
        .select({
          authorId: collections.authorId,
        })
        .from(collections)
        .where(eq(collections.id, collectionId));

      const collectionResult = await collectionQuery;

      if (collectionResult.length === 0) {
        return {
          items: [],
          totalCount: 0,
          hasMore: false,
        };
      }

      const collectionAuthorId = collectionResult[0]!.authorId;

      // For URL_LIBRARY_COUNT sorting, we need a more complex query
      let cardsQuery;
      if (sortBy === CardSortField.LIBRARY_COUNT) {
        // Sort by URL library count - need to calculate it in the query
        cardsQuery = this.db
          .select({
            id: cards.id,
            authorId: cards.authorId,
            url: cards.url,
            contentData: cards.contentData,
            libraryCount: cards.libraryCount,
            createdAt: cards.createdAt,
            updatedAt: cards.updatedAt,
            urlLibraryCount: countDistinct(libraryMemberships.userId),
          })
          .from(cards)
          .innerJoin(collectionCards, eq(cards.id, collectionCards.cardId))
          .leftJoin(
            cards.as('urlCards'),
            and(
              eq(cards.url, cards.as('urlCards').url),
              eq(cards.as('urlCards').type, CardTypeEnum.URL),
            ),
          )
          .leftJoin(
            libraryMemberships,
            eq(cards.as('urlCards').id, libraryMemberships.cardId),
          )
          .where(
            and(
              eq(collectionCards.collectionId, collectionId),
              eq(cards.type, CardTypeEnum.URL),
            ),
          )
          .groupBy(
            cards.id,
            cards.authorId,
            cards.url,
            cards.contentData,
            cards.libraryCount,
            cards.createdAt,
            cards.updatedAt,
          )
          .orderBy(orderDirection(countDistinct(libraryMemberships.userId)))
          .limit(limit)
          .offset(offset);
      } else {
        // Standard query for other sort fields
        cardsQuery = this.db
          .select({
            id: cards.id,
            authorId: cards.authorId,
            url: cards.url,
            contentData: cards.contentData,
            libraryCount: cards.libraryCount,
            createdAt: cards.createdAt,
            updatedAt: cards.updatedAt,
          })
          .from(cards)
          .innerJoin(collectionCards, eq(cards.id, collectionCards.cardId))
          .where(
            and(
              eq(collectionCards.collectionId, collectionId),
              eq(cards.type, CardTypeEnum.URL),
            ),
          )
          .orderBy(orderDirection(this.getSortColumn(sortBy)))
          .limit(limit)
          .offset(offset);
      }

      const cardsResult = await cardsQuery;

      if (cardsResult.length === 0) {
        return {
          items: [],
          totalCount: 0,
          hasMore: false,
        };
      }

      const cardIds = cardsResult.map((card) => card.id);
      const urls = cardsResult.map((card) => card.url || '');

      // Get note cards for these URL cards, but only by the collection author
      const notesQuery = this.db
        .select({
          id: cards.id,
          parentCardId: cards.parentCardId,
          contentData: cards.contentData,
        })
        .from(cards)
        .where(
          and(
            eq(cards.type, CardTypeEnum.NOTE),
            inArray(cards.parentCardId, cardIds),
            eq(cards.authorId, collectionAuthorId),
          ),
        );

      const notesResult = await notesQuery;

      // Get urlLibraryCount for each URL (count of unique users who have cards with this URL)
      // Skip this if we already calculated it in the main query for sorting
      let urlLibraryCountMap = new Map<string, number>();
      if (sortBy === CardSortField.LIBRARY_COUNT) {
        // URL library counts were already calculated in the main query
        cardsResult.forEach((card) => {
          if (card.url && 'urlLibraryCount' in card) {
            urlLibraryCountMap.set(card.url, (card as any).urlLibraryCount);
          }
        });
      } else {
        // Calculate URL library counts separately
        const urlLibraryCountsQuery = this.db
          .select({
            url: cards.url,
            count: countDistinct(libraryMemberships.userId),
          })
          .from(cards)
          .innerJoin(libraryMemberships, eq(cards.id, libraryMemberships.cardId))
          .where(and(eq(cards.type, CardTypeEnum.URL), inArray(cards.url, urls)))
          .groupBy(cards.url);

        const urlLibraryCountsResult = await urlLibraryCountsQuery;

        urlLibraryCountsResult.forEach((row) => {
          if (row.url) {
            urlLibraryCountMap.set(row.url, row.count);
          }
        });
      }

      // Get urlInLibrary for each URL if callingUserId is provided
      let urlInLibraryMap: Map<string, boolean> | undefined;
      if (callingUserId) {
        const urlInLibraryQuery = this.db
          .select({
            url: cards.url,
          })
          .from(cards)
          .where(
            and(
              eq(cards.authorId, callingUserId),
              eq(cards.type, CardTypeEnum.URL),
              inArray(cards.url, urls),
            ),
          );

        const urlInLibraryResult = await urlInLibraryQuery;

        urlInLibraryMap = new Map<string, boolean>();
        // Initialize all URLs as false
        urls.forEach((url) => urlInLibraryMap!.set(url, false));
        // Set true for URLs the calling user has
        urlInLibraryResult.forEach((row) => {
          if (row.url) {
            urlInLibraryMap!.set(row.url, true);
          }
        });
      }

      // Get total count
      const totalCountResult = await this.db
        .select({ count: count() })
        .from(cards)
        .innerJoin(collectionCards, eq(cards.id, collectionCards.cardId))
        .where(
          and(
            eq(collectionCards.collectionId, collectionId),
            eq(cards.type, CardTypeEnum.URL),
          ),
        );

      const totalCount = totalCountResult[0]?.count || 0;
      const hasMore = offset + cardsResult.length < totalCount;

      // Combine the data
      const rawCardData = cardsResult.map((card) => {
        // Find note for this card
        const note = notesResult.find((n) => n.parentCardId === card.id);

        // Get urlLibraryCount from the map
        const urlLibraryCount = urlLibraryCountMap.get(card.url || '') || 0;

        // Get urlInLibrary from the map (undefined if callingUserId not provided)
        const urlInLibrary = urlInLibraryMap?.get(card.url || '');

        return {
          id: card.id,
          authorId: card.authorId,
          url: card.url || '',
          contentData: card.contentData,
          libraryCount: card.libraryCount,
          urlLibraryCount,
          urlInLibrary,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
          note: note
            ? {
                id: note.id,
                contentData: note.contentData,
              }
            : undefined,
        };
      });

      // Map to DTOs
      const items = rawCardData.map((raw) =>
        CardMapper.toCollectionCardQueryResult(raw),
      );

      return {
        items,
        totalCount,
        hasMore,
      };
    } catch (error) {
      console.error('Error in getCardsInCollection:', error);
      throw error;
    }
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
