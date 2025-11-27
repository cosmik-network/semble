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

      // Get cards in collection - use standard query for all sort fields
      const cardsQuery = this.db
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
        );

      // For LIBRARY_COUNT sorting, we need to sort by urlLibraryCount after calculating it
      let cardsWithUrlLibraryCount: Array<{
        id: string;
        authorId: string;
        url: string | null;
        contentData: any;
        libraryCount: number;
        createdAt: Date;
        updatedAt: Date;
        urlLibraryCount: number;
      }> = [];

      if (sortBy === CardSortField.LIBRARY_COUNT) {
        // Get all cards first
        const allCardsResult = await cardsQuery;

        if (allCardsResult.length === 0) {
          return {
            items: [],
            totalCount: 0,
            hasMore: false,
          };
        }

        const urls = allCardsResult.map((card) => card.url || '');

        // Calculate urlLibraryCount for each URL
        const urlLibraryCountsQuery = this.db
          .select({
            url: cards.url,
            count: countDistinct(libraryMemberships.userId),
          })
          .from(cards)
          .innerJoin(
            libraryMemberships,
            eq(cards.id, libraryMemberships.cardId),
          )
          .where(
            and(eq(cards.type, CardTypeEnum.URL), inArray(cards.url, urls)),
          )
          .groupBy(cards.url);

        const urlLibraryCountsResult = await urlLibraryCountsQuery;

        // Create a map of URL to urlLibraryCount
        const urlLibraryCountMap = new Map<string, number>();
        urlLibraryCountsResult.forEach((row) => {
          if (row.url) {
            urlLibraryCountMap.set(row.url, row.count);
          }
        });

        // Combine cards with their urlLibraryCount
        cardsWithUrlLibraryCount = allCardsResult.map((card) => ({
          ...card,
          urlLibraryCount: urlLibraryCountMap.get(card.url || '') || 0,
        }));

        // Sort by urlLibraryCount with secondary sort by updatedAt
        cardsWithUrlLibraryCount.sort((a, b) => {
          // Primary sort: urlLibraryCount
          const libraryCountDiff = sortOrder === SortOrder.ASC 
            ? a.urlLibraryCount - b.urlLibraryCount
            : b.urlLibraryCount - a.urlLibraryCount;
          
          // If library counts are equal, sort by updatedAt (default sort)
          if (libraryCountDiff === 0) {
            return b.updatedAt.getTime() - a.updatedAt.getTime(); // DESC order for updatedAt
          }
          
          return libraryCountDiff;
        });

        // Apply pagination
        const startIndex = (page - 1) * limit;
        cardsWithUrlLibraryCount = cardsWithUrlLibraryCount.slice(
          startIndex,
          startIndex + limit,
        );
      }

      // Execute query based on sort type
      let cardsResult: Array<{
        id: string;
        authorId: string;
        url: string | null;
        contentData: any;
        libraryCount: number;
        createdAt: Date;
        updatedAt: Date;
      }>;

      if (sortBy === CardSortField.LIBRARY_COUNT) {
        // Use pre-sorted and paginated results
        cardsResult = cardsWithUrlLibraryCount;
      } else {
        // Execute standard query with sorting and pagination
        cardsResult = await cardsQuery
          .orderBy(orderDirection(this.getCollectionSortColumn(sortBy)))
          .limit(limit)
          .offset(offset);
      }

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
      let urlLibraryCountMap = new Map<string, number>();
      if (sortBy === CardSortField.LIBRARY_COUNT) {
        // URL library counts were already calculated for sorting
        cardsWithUrlLibraryCount.forEach((card) => {
          if (card.url) {
            urlLibraryCountMap.set(card.url, card.urlLibraryCount);
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
          .innerJoin(
            libraryMemberships,
            eq(cards.id, libraryMemberships.cardId),
          )
          .where(
            and(eq(cards.type, CardTypeEnum.URL), inArray(cards.url, urls)),
          )
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
      // const offset = (page - 1) * limit;
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

  private getCollectionSortColumn(sortBy: CardSortField) {
    switch (sortBy) {
      case CardSortField.CREATED_AT:
        return collectionCards.addedAt;
      case CardSortField.UPDATED_AT:
        return collectionCards.addedAt;
      case CardSortField.LIBRARY_COUNT:
        return cards.libraryCount;
      default:
        return collectionCards.addedAt;
    }
  }
}
