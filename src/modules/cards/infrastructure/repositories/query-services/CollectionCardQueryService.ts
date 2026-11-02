import { eq, desc, asc, count, inArray, and } from 'drizzle-orm';
import { UrlType } from '../../../domain/value-objects/UrlType';
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
import { publishedRecords } from '../schema/publishedRecord.sql';
import { CardMapper } from '../mappers/CardMapper';
import { CardTypeEnum } from '../../../domain/value-objects/CardType';
import { fetchUrlEngagement, fetchUrlLibraryCounts } from './urlStatsQueries';

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

      // Build where conditions
      const whereConditions = [
        eq(collectionCards.collectionId, collectionId),
        eq(cards.type, CardTypeEnum.URL),
      ];

      if (options.urlType) {
        whereConditions.push(eq(cards.urlType, options.urlType));
      }

      // Get cards in collection - use standard query for all sort fields
      const cardsQuery = this.db
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
        .innerJoin(collectionCards, eq(cards.id, collectionCards.cardId))
        .leftJoin(
          publishedRecords,
          eq(cards.publishedRecordId, publishedRecords.id),
        )
        .where(and(...whereConditions));

      // For LIBRARY_COUNT sorting, we need to sort by urlLibraryCount after calculating it
      let cardsWithUrlLibraryCount: Array<{
        id: string;
        authorId: string;
        url: string | null;
        publishedRecordUri: string | null;
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
        const urlLibraryCountMap = await fetchUrlLibraryCounts(this.db, urls);

        // Combine cards with their urlLibraryCount
        cardsWithUrlLibraryCount = allCardsResult.map((card) => ({
          ...card,
          urlLibraryCount: urlLibraryCountMap.get(card.url || '') || 0,
        }));

        // Sort by urlLibraryCount with secondary sort by updatedAt
        cardsWithUrlLibraryCount.sort((a, b) => {
          // Primary sort: urlLibraryCount
          const libraryCountDiff =
            sortOrder === SortOrder.ASC
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
        publishedRecordUri: string | null;
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

      // Get note cards for these URL cards
      // We'll filter by author in the mapping step to match each note's author to its parent card's author
      const notesQuery = this.db
        .select({
          id: cards.id,
          parentCardId: cards.parentCardId,
          authorId: cards.authorId,
          contentData: cards.contentData,
        })
        .from(cards)
        .where(
          and(
            eq(cards.type, CardTypeEnum.NOTE),
            inArray(cards.parentCardId, cardIds),
          ),
        );

      const [notesResult, urlEngagementMap] = await Promise.all([
        notesQuery,
        fetchUrlEngagement(this.db, urls, callingUserId),
      ]);

      // Get total count
      const totalCountResult = await this.db
        .select({ count: count() })
        .from(cards)
        .innerJoin(collectionCards, eq(cards.id, collectionCards.cardId))
        .where(and(...whereConditions));

      const totalCount = totalCountResult[0]?.count || 0;
      // const offset = (page - 1) * limit;
      const hasMore = offset + cardsResult.length < totalCount;

      // Combine the data
      const rawCardData = cardsResult.map((card) => {
        // Find note for this card (only notes by the same author as the card)
        const note = notesResult.find(
          (n) => n.parentCardId === card.id && n.authorId === card.authorId,
        );

        const engagement = urlEngagementMap.get(card.url || '')!;

        return {
          id: card.id,
          authorId: card.authorId,
          url: card.url || '',
          uri: card.publishedRecordUri || undefined,
          contentData: card.contentData,
          libraryCount: card.libraryCount,
          ...engagement,
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
