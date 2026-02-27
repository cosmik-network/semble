import { eq, desc, asc, count, countDistinct, inArray, and } from 'drizzle-orm';
import { UrlType } from '../../../domain/value-objects/UrlType';
import { UrlCardView } from '../../../domain/ICardQueryRepository';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  CardQueryOptions,
  PaginatedQueryResult,
  UrlCardQueryResultDTO,
  UrlCardViewDTO,
  LibraryForUrlDTO,
  CardSortField,
  SortOrder,
  UrlLibraryInfo,
} from '../../../domain/ICardQueryRepository';
import { cards } from '../schema/card.sql';
import { collections, collectionCards } from '../schema/collection.sql';
import { libraryMemberships } from '../schema/libraryMembership.sql';
import { publishedRecords } from '../schema/publishedRecord.sql';
import { CardMapper, RawUrlCardData } from '../mappers/CardMapper';
import { CardTypeEnum } from '../../../domain/value-objects/CardType';

export class UrlCardQueryService {
  constructor(private db: PostgresJsDatabase) {}

  async getUrlCardsOfUser(
    userId: string,
    options: CardQueryOptions,
    callingUserId?: string,
  ): Promise<PaginatedQueryResult<UrlCardQueryResultDTO>> {
    try {
      const { page, limit, sortBy, sortOrder } = options;
      const offset = (page - 1) * limit;

      // Build the sort order
      const orderDirection = sortOrder === SortOrder.ASC ? asc : desc;

      // Build where conditions
      const whereConditions = [
        eq(cards.authorId, userId),
        eq(cards.type, CardTypeEnum.URL),
      ];

      if (options.urlType) {
        whereConditions.push(eq(cards.urlType, options.urlType));
      }

      // For LIBRARY_COUNT sorting, we need to handle urlLibraryCount calculation and sorting separately
      if (sortBy === CardSortField.LIBRARY_COUNT) {
        // Get all URL cards for the user first
        const allUrlCardsQuery = this.db
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
          .where(and(...whereConditions));

        const allUrlCardsResult = await allUrlCardsQuery;

        if (allUrlCardsResult.length === 0) {
          return {
            items: [],
            totalCount: 0,
            hasMore: false,
          };
        }

        const urls = allUrlCardsResult.map((card) => card.url || '');

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
        const cardsWithUrlLibraryCount = allUrlCardsResult.map((card) => ({
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
        const urlCardsResult = cardsWithUrlLibraryCount.slice(
          startIndex,
          startIndex + limit,
        );

        // Continue with the rest of the method using urlCardsResult
        if (urlCardsResult.length === 0) {
          return {
            items: [],
            totalCount: allUrlCardsResult.length,
            hasMore: false,
          };
        }

        const cardIds = urlCardsResult.map((card) => card.id);
        const urls_paginated = urlCardsResult.map((card) => card.url || '');

        // Get collections for these cards
        const collectionsQuery = this.db
          .select({
            cardId: collectionCards.cardId,
            collectionId: collections.id,
            collectionName: collections.name,
            authorId: collections.authorId,
            accessType: collections.accessType,
          })
          .from(collectionCards)
          .innerJoin(
            collections,
            eq(collectionCards.collectionId, collections.id),
          )
          .where(inArray(collectionCards.cardId, cardIds));

        const collectionsResult = await collectionsQuery;

        // Get note cards for these URL cards (same user, parentCardId matches, type = NOTE)
        const notesQuery = this.db
          .select({
            id: cards.id,
            parentCardId: cards.parentCardId,
            contentData: cards.contentData,
          })
          .from(cards)
          .where(
            and(
              eq(cards.authorId, userId),
              eq(cards.type, CardTypeEnum.NOTE),
              inArray(cards.parentCardId, cardIds),
            ),
          );

        const notesResult = await notesQuery;

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
                inArray(cards.url, urls_paginated),
              ),
            );

          const urlInLibraryResult = await urlInLibraryQuery;

          urlInLibraryMap = new Map<string, boolean>();
          // Initialize all URLs as false
          urls_paginated.forEach((url) => urlInLibraryMap!.set(url, false));
          // Set true for URLs the calling user has
          urlInLibraryResult.forEach((row) => {
            if (row.url) {
              urlInLibraryMap!.set(row.url, true);
            }
          });
        }

        const totalCount = allUrlCardsResult.length;
        const hasMore = startIndex + urlCardsResult.length < totalCount;

        // Combine the data
        const rawCardData: RawUrlCardData[] = urlCardsResult.map((card) => {
          // Find collections for this card
          const cardCollections = collectionsResult
            .filter((c) => c.cardId === card.id)
            .map((c) => ({
              id: c.collectionId,
              name: c.collectionName,
              authorId: c.authorId,
              accessType: c.accessType,
            }));

          // Find note for this card
          const note = notesResult.find((n) => n.parentCardId === card.id);

          // Get urlLibraryCount from the card (already calculated)
          const urlLibraryCount = card.urlLibraryCount;

          // Get urlInLibrary from the map (undefined if callingUserId not provided)
          const urlInLibrary = urlInLibraryMap?.get(card.url || '');

          return {
            id: card.id,
            authorId: card.authorId,
            url: card.url || '',
            uri: card.publishedRecordUri || undefined,
            contentData: card.contentData,
            libraryCount: card.libraryCount,
            urlLibraryCount,
            urlInLibrary,
            createdAt: card.createdAt,
            updatedAt: card.updatedAt,
            collections: cardCollections,
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
          CardMapper.toUrlCardQueryResult(raw),
        );

        return {
          items,
          totalCount,
          hasMore,
        };
      }

      // Standard sorting for other fields
      const urlCardsQuery = this.db
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
        .where(and(...whereConditions))
        .orderBy(orderDirection(this.getSortColumn(sortBy)))
        .limit(limit)
        .offset(offset);

      const urlCardsResult = await urlCardsQuery;

      if (urlCardsResult.length === 0) {
        return {
          items: [],
          totalCount: 0,
          hasMore: false,
        };
      }

      const cardIds = urlCardsResult.map((card) => card.id);
      const urls = urlCardsResult.map((card) => card.url || '');

      // Get collections for these cards
      const collectionsQuery = this.db
        .select({
          cardId: collectionCards.cardId,
          collectionId: collections.id,
          collectionName: collections.name,
          authorId: collections.authorId,
          accessType: collections.accessType,
        })
        .from(collectionCards)
        .innerJoin(
          collections,
          eq(collectionCards.collectionId, collections.id),
        )
        .where(inArray(collectionCards.cardId, cardIds));

      const collectionsResult = await collectionsQuery;

      // Get note cards for these URL cards (same user, parentCardId matches, type = NOTE)
      const notesQuery = this.db
        .select({
          id: cards.id,
          parentCardId: cards.parentCardId,
          contentData: cards.contentData,
        })
        .from(cards)
        .where(
          and(
            eq(cards.authorId, userId),
            eq(cards.type, CardTypeEnum.NOTE),
            inArray(cards.parentCardId, cardIds),
          ),
        );

      const notesResult = await notesQuery;

      // Get urlLibraryCount for each URL (count of unique users who have cards with this URL)
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

      // Create a map of URL to urlLibraryCount
      const urlLibraryCountMap = new Map<string, number>();
      urlLibraryCountsResult.forEach((row) => {
        if (row.url) {
          urlLibraryCountMap.set(row.url, row.count);
        }
      });

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
        .where(and(...whereConditions));

      const totalCount = totalCountResult[0]?.count || 0;
      const hasMore = offset + urlCardsResult.length < totalCount;

      // Combine the data
      const rawCardData: RawUrlCardData[] = urlCardsResult.map((card) => {
        // Find collections for this card
        const cardCollections = collectionsResult
          .filter((c) => c.cardId === card.id)
          .map((c) => ({
            id: c.collectionId,
            name: c.collectionName,
            authorId: c.authorId,
            accessType: c.accessType,
          }));

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
          uri: card.publishedRecordUri || undefined,
          contentData: card.contentData,
          libraryCount: card.libraryCount,
          urlLibraryCount,
          urlInLibrary,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
          collections: cardCollections,
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
        CardMapper.toUrlCardQueryResult(raw),
      );

      return {
        items,
        totalCount,
        hasMore,
      };
    } catch (error) {
      console.error('Error in getUrlCardsOfUser:', error);
      throw error;
    }
  }

  async getUrlCardView(
    cardId: string,
    callingUserId?: string,
  ): Promise<UrlCardViewDTO | null> {
    try {
      // Get the URL card
      const cardQuery = this.db
        .select({
          id: cards.id,
          type: cards.type,
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
        .where(and(eq(cards.id, cardId), eq(cards.type, CardTypeEnum.URL)));

      const cardResult = await cardQuery;

      if (cardResult.length === 0) {
        return null;
      }

      const card = cardResult[0]!;

      // Get users who have this card in their libraries
      const libraryQuery = this.db
        .select({
          userId: libraryMemberships.userId,
        })
        .from(libraryMemberships)
        .where(eq(libraryMemberships.cardId, cardId));

      const libraryResult = await libraryQuery;

      // Get collections that contain this card
      const collectionsQuery = this.db
        .select({
          collectionId: collections.id,
          collectionName: collections.name,
          authorId: collections.authorId,
          accessType: collections.accessType,
        })
        .from(collectionCards)
        .innerJoin(
          collections,
          eq(collectionCards.collectionId, collections.id),
        )
        .where(eq(collectionCards.cardId, cardId));

      const collectionsResult = await collectionsQuery;

      // Get note card for this URL card (parentCardId matches, type = NOTE)
      const noteQuery = this.db
        .select({
          id: cards.id,
          parentCardId: cards.parentCardId,
          contentData: cards.contentData,
        })
        .from(cards)
        .where(
          and(
            eq(cards.type, CardTypeEnum.NOTE),
            eq(cards.parentCardId, cardId),
          ),
        );

      const noteResult = await noteQuery;
      const note = noteResult.length > 0 ? noteResult[0] : undefined;

      // Get urlLibraryCount for this URL
      const urlLibraryCountQuery = this.db
        .select({
          count: countDistinct(libraryMemberships.userId),
        })
        .from(cards)
        .innerJoin(libraryMemberships, eq(cards.id, libraryMemberships.cardId))
        .where(and(eq(cards.type, CardTypeEnum.URL), eq(cards.url, card.url)));

      const urlLibraryCountResult = await urlLibraryCountQuery;
      const urlLibraryCount = urlLibraryCountResult[0]?.count || 0;

      // Get urlInLibrary if callingUserId is provided
      let urlInLibrary: boolean | undefined;
      if (callingUserId) {
        // Check if the calling user has any card with this URL
        const urlInLibraryQuery = this.db
          .select({
            id: cards.id,
          })
          .from(cards)
          .where(
            and(
              eq(cards.authorId, callingUserId),
              eq(cards.type, CardTypeEnum.URL),
              eq(cards.url, card.url),
            ),
          )
          .limit(1);

        const urlInLibraryResult = await urlInLibraryQuery;
        urlInLibrary = urlInLibraryResult.length > 0;
      }

      // Map to DTO
      const urlCardView = CardMapper.toUrlCardViewDTO({
        id: card.id,
        type: card.type,
        authorId: card.authorId,
        url: card.url || '',
        uri: card.publishedRecordUri || undefined,
        contentData: card.contentData,
        libraryCount: card.libraryCount,
        urlLibraryCount,
        urlInLibrary,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        inLibraries: libraryResult.map((lib) => ({ userId: lib.userId })),
        inCollections: collectionsResult.map((coll) => ({
          id: coll.collectionId,
          name: coll.collectionName,
          authorId: coll.authorId,
          accessType: coll.accessType,
        })),
        note: note
          ? {
              id: note.id,
              contentData: note.contentData,
            }
          : undefined,
      });

      return urlCardView;
    } catch (error) {
      console.error('Error in getUrlCardView:', error);
      throw error;
    }
  }

  async getLibrariesForUrl(
    url: string,
    options: CardQueryOptions,
  ): Promise<PaginatedQueryResult<LibraryForUrlDTO>> {
    try {
      const { page, limit, sortBy, sortOrder } = options;
      const offset = (page - 1) * limit;

      // Build the sort order
      const orderDirection = sortOrder === SortOrder.ASC ? asc : desc;

      // For LIBRARY_COUNT sorting, we need to handle urlLibraryCount calculation and sorting separately
      if (sortBy === CardSortField.LIBRARY_COUNT) {
        // Get all URL cards with this URL and their library memberships first
        const allLibrariesQuery = this.db
          .select({
            userId: libraryMemberships.userId,
            cardId: cards.id,
            url: cards.url,
            contentData: cards.contentData,
            libraryCount: cards.libraryCount,
            createdAt: cards.createdAt,
            updatedAt: cards.updatedAt,
          })
          .from(libraryMemberships)
          .innerJoin(cards, eq(libraryMemberships.cardId, cards.id))
          .where(and(eq(cards.url, url), eq(cards.type, CardTypeEnum.URL)));

        const allLibrariesResult = await allLibrariesQuery;

        // Get urlLibraryCount for this URL
        const urlLibraryCountQuery = this.db
          .select({
            count: countDistinct(libraryMemberships.userId),
          })
          .from(cards)
          .innerJoin(
            libraryMemberships,
            eq(cards.id, libraryMemberships.cardId),
          )
          .where(and(eq(cards.type, CardTypeEnum.URL), eq(cards.url, url)));

        const urlLibraryCountResult = await urlLibraryCountQuery;
        const urlLibraryCount = urlLibraryCountResult[0]?.count || 0;

        // Add urlLibraryCount to each result
        const librariesWithCount = allLibrariesResult.map((lib) => ({
          ...lib,
          urlLibraryCount,
        }));

        // Sort by urlLibraryCount with secondary sort by updatedAt
        librariesWithCount.sort((a, b) => {
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
        const librariesResult = librariesWithCount.slice(
          startIndex,
          startIndex + limit,
        );

        // Get total count (needed even if current page is empty)
        const totalCount = allLibrariesResult.length;

        if (librariesResult.length === 0) {
          return {
            items: [],
            totalCount,
            hasMore: false,
          };
        }

        const cardIds = librariesResult.map((lib) => lib.cardId);

        // Get notes for these cards
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
            ),
          );

        const notesResult = await notesQuery;

        const hasMore = startIndex + librariesResult.length < totalCount;

        const items: LibraryForUrlDTO[] = librariesResult.map((lib) => {
          const note = notesResult.find((n) => n.parentCardId === lib.cardId);

          return {
            userId: lib.userId,
            card: {
              id: lib.cardId,
              url: lib.url || '',
              cardContent: {
                url: lib.contentData?.url,
                title: lib.contentData?.metadata?.title,
                description: lib.contentData?.metadata?.description,
                author: lib.contentData?.metadata?.author,
                publishedDate: lib.contentData?.metadata?.publishedDate
                  ? new Date(lib.contentData.metadata.publishedDate)
                  : undefined,
                siteName: lib.contentData?.metadata?.siteName,
                imageUrl: lib.contentData?.metadata?.imageUrl,
                type: lib.contentData?.metadata?.type,
                retrievedAt: lib.contentData?.metadata?.retrievedAt
                  ? new Date(lib.contentData.metadata.retrievedAt)
                  : undefined,
                doi: lib.contentData?.metadata?.doi,
                isbn: lib.contentData?.metadata?.isbn,
              },
              libraryCount: lib.libraryCount,
              urlLibraryCount: lib.urlLibraryCount,
              urlInLibrary: true, // By definition, if it's in this result, it's in a library
              createdAt: lib.createdAt,
              updatedAt: lib.updatedAt,
              note: note
                ? {
                    id: note.id,
                    text: note.contentData?.text || '',
                  }
                : undefined,
            },
          };
        });

        return {
          items,
          totalCount,
          hasMore,
        };
      }

      // Standard sorting for other fields
      const librariesQuery = this.db
        .select({
          userId: libraryMemberships.userId,
          cardId: cards.id,
          url: cards.url,
          publishedRecordUri: publishedRecords.uri,
          contentData: cards.contentData,
          libraryCount: cards.libraryCount,
          createdAt: cards.createdAt,
          updatedAt: cards.updatedAt,
        })
        .from(libraryMemberships)
        .innerJoin(cards, eq(libraryMemberships.cardId, cards.id))
        .leftJoin(
          publishedRecords,
          eq(cards.publishedRecordId, publishedRecords.id),
        )
        .where(and(eq(cards.url, url), eq(cards.type, CardTypeEnum.URL)))
        .orderBy(orderDirection(this.getSortColumn(sortBy)))
        .limit(limit)
        .offset(offset);

      const librariesResult = await librariesQuery;

      // Get total count (needed even if current page is empty)
      const totalCountResult = await this.db
        .select({ count: count() })
        .from(libraryMemberships)
        .innerJoin(cards, eq(libraryMemberships.cardId, cards.id))
        .where(and(eq(cards.url, url), eq(cards.type, CardTypeEnum.URL)));

      const totalCount = totalCountResult[0]?.count || 0;

      if (librariesResult.length === 0) {
        return {
          items: [],
          totalCount,
          hasMore: false,
        };
      }

      const cardIds = librariesResult.map((lib) => lib.cardId);

      // Get notes for these cards
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
          ),
        );

      const notesResult = await notesQuery;

      // Get urlLibraryCount for this URL
      const urlLibraryCountQuery = this.db
        .select({
          count: countDistinct(libraryMemberships.userId),
        })
        .from(cards)
        .innerJoin(libraryMemberships, eq(cards.id, libraryMemberships.cardId))
        .where(and(eq(cards.type, CardTypeEnum.URL), eq(cards.url, url)));

      const urlLibraryCountResult = await urlLibraryCountQuery;
      const urlLibraryCount = urlLibraryCountResult[0]?.count || 0;

      const hasMore = offset + librariesResult.length < totalCount;

      const items: LibraryForUrlDTO[] = librariesResult.map((lib) => {
        const note = notesResult.find((n) => n.parentCardId === lib.cardId);

        return {
          userId: lib.userId,
          card: {
            id: lib.cardId,
            url: lib.url || '',
            uri: lib.publishedRecordUri || undefined,
            cardContent: {
              url: lib.contentData?.url,
              title: lib.contentData?.metadata?.title,
              description: lib.contentData?.metadata?.description,
              author: lib.contentData?.metadata?.author,
              publishedDate: lib.contentData?.metadata?.publishedDate
                ? new Date(lib.contentData.metadata.publishedDate)
                : undefined,
              siteName: lib.contentData?.metadata?.siteName,
              imageUrl: lib.contentData?.metadata?.imageUrl,
              type: lib.contentData?.metadata?.type,
              retrievedAt: lib.contentData?.metadata?.retrievedAt
                ? new Date(lib.contentData.metadata.retrievedAt)
                : undefined,
              doi: lib.contentData?.metadata?.doi,
              isbn: lib.contentData?.metadata?.isbn,
            },
            libraryCount: lib.libraryCount,
            urlLibraryCount,
            urlInLibrary: true, // By definition, if it's in this result, it's in a library
            createdAt: lib.createdAt,
            updatedAt: lib.updatedAt,
            note: note
              ? {
                  id: note.id,
                  text: note.contentData?.text || '',
                }
              : undefined,
          },
        };
      });

      return {
        items,
        totalCount,
        hasMore,
      };
    } catch (error) {
      console.error('Error in getLibrariesForUrl:', error);
      throw error;
    }
  }

  async getUrlCardBasic(
    cardId: string,
    callingUserId?: string,
  ): Promise<UrlCardView | null> {
    try {
      // Get the URL card
      const cardQuery = this.db
        .select({
          id: cards.id,
          type: cards.type,
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
        .where(and(eq(cards.id, cardId), eq(cards.type, CardTypeEnum.URL)));

      const cardResult = await cardQuery;

      if (cardResult.length === 0) {
        return null;
      }

      const card = cardResult[0]!;

      // Get note card for this URL card (same user, parentCardId matches, type = NOTE)
      const noteQuery = this.db
        .select({
          id: cards.id,
          parentCardId: cards.parentCardId,
          contentData: cards.contentData,
        })
        .from(cards)
        .where(
          and(
            eq(cards.type, CardTypeEnum.NOTE),
            eq(cards.parentCardId, cardId),
            eq(cards.authorId, card.authorId), // Only notes by the same author
          ),
        )
        .limit(1); // Only get the first note if multiple exist

      const noteResult = await noteQuery;
      const note = noteResult.length > 0 ? noteResult[0] : undefined;

      // Get urlLibraryCount for this URL (count of unique users who have cards with this URL)
      const urlLibraryCountQuery = this.db
        .select({
          count: countDistinct(libraryMemberships.userId),
        })
        .from(cards)
        .innerJoin(libraryMemberships, eq(cards.id, libraryMemberships.cardId))
        .where(and(eq(cards.type, CardTypeEnum.URL), eq(cards.url, card.url)));

      const urlLibraryCountResult = await urlLibraryCountQuery;
      const urlLibraryCount = urlLibraryCountResult[0]?.count || 0;

      // Get urlInLibrary if callingUserId is provided
      let urlInLibrary: boolean | undefined;
      if (callingUserId) {
        // Check if the calling user has any card with this URL
        const urlInLibraryQuery = this.db
          .select({
            id: cards.id,
          })
          .from(cards)
          .where(
            and(
              eq(cards.authorId, callingUserId),
              eq(cards.type, CardTypeEnum.URL),
              eq(cards.url, card.url),
            ),
          )
          .limit(1);

        const urlInLibraryResult = await urlInLibraryQuery;
        urlInLibrary = urlInLibraryResult.length > 0;
      }

      // Create raw card data for mapping
      const rawCardData = {
        id: card.id,
        authorId: card.authorId,
        url: card.url || '',
        uri: card.publishedRecordUri || undefined,
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

      // Use CardMapper to transform to UrlCardView (without collections)
      return CardMapper.toCollectionCardQueryResult(rawCardData);
    } catch (error) {
      console.error('Error in getUrlCardBasic:', error);
      throw error;
    }
  }

  async getBatchUrlCardViews(
    cardIds: string[],
    callingUserId?: string,
  ): Promise<Map<string, UrlCardView>> {
    try {
      if (cardIds.length === 0) {
        return new Map();
      }

      // Fetch all cards in one query
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
        .leftJoin(
          publishedRecords,
          eq(cards.publishedRecordId, publishedRecords.id),
        )
        .where(
          and(inArray(cards.id, cardIds), eq(cards.type, CardTypeEnum.URL)),
        );

      const cardsResult = await cardsQuery;

      if (cardsResult.length === 0) {
        return new Map();
      }

      // Get unique URLs for batch queries
      const urls = [...new Set(cardsResult.map((card) => card.url || ''))];

      // Get notes for all cards in one query
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

      const notesResult = await notesQuery;

      // Get urlLibraryCount for all URLs in one query
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

      // Create map of URL to urlLibraryCount
      const urlLibraryCountMap = new Map<string, number>();
      urlLibraryCountsResult.forEach((row) => {
        if (row.url) {
          urlLibraryCountMap.set(row.url, row.count);
        }
      });

      // Get urlInLibrary for all URLs if callingUserId is provided
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

      // Build result map
      const resultMap = new Map<string, UrlCardView>();

      for (const card of cardsResult) {
        // Find note for this card (matching both parentCardId and authorId)
        const note = notesResult.find(
          (n) => n.parentCardId === card.id && n.authorId === card.authorId,
        );

        // Get urlLibraryCount from map
        const urlLibraryCount = urlLibraryCountMap.get(card.url || '') || 0;

        // Get urlInLibrary from map
        const urlInLibrary = urlInLibraryMap?.get(card.url || '');

        const rawCardData = {
          id: card.id,
          authorId: card.authorId,
          url: card.url || '',
          uri: card.publishedRecordUri || undefined,
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

        const urlCardView = CardMapper.toCollectionCardQueryResult(rawCardData);
        resultMap.set(card.id, urlCardView);
      }

      return resultMap;
    } catch (error) {
      console.error('Error in getBatchUrlCardViews:', error);
      throw error;
    }
  }

  async getBatchUrlLibraryInfo(
    urls: string[],
    callingUserId?: string,
  ): Promise<Map<string, UrlLibraryInfo>> {
    try {
      // Return empty map if no URLs provided
      if (urls.length === 0) {
        return new Map();
      }

      // 1. Get URL library counts (distinct users per URL)
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

      // Build map of URL to library count
      const urlLibraryCountMap = new Map<string, number>();
      urlLibraryCountsResult.forEach((row) => {
        if (row.url) {
          urlLibraryCountMap.set(row.url, Number(row.count));
        }
      });

      // 2. Get URLs that calling user has (if callingUserId provided)
      let urlInLibraryMap: Map<string, boolean> | undefined;
      if (callingUserId) {
        urlInLibraryMap = new Map();

        const userUrlsQuery = this.db
          .select({
            url: cards.url,
          })
          .from(cards)
          .where(
            and(
              eq(cards.type, CardTypeEnum.URL),
              eq(cards.authorId, callingUserId),
              inArray(cards.url, urls),
            ),
          );

        const userUrlsResult = await userUrlsQuery;

        userUrlsResult.forEach((row) => {
          if (row.url) {
            urlInLibraryMap!.set(row.url, true);
          }
        });
      }

      // 3. Get sample card metadata for each URL (one card per URL)
      // We'll get the most recently updated card for each URL
      const sampleCardsQuery = this.db
        .select({
          url: cards.url,
          contentData: cards.contentData,
        })
        .from(cards)
        .where(and(eq(cards.type, CardTypeEnum.URL), inArray(cards.url, urls)))
        .orderBy(desc(cards.updatedAt));

      const sampleCardsResult = await sampleCardsQuery;

      // Build map of URL to sample card (keep first occurrence per URL)
      const sampleCardMap = new Map<string, any>();
      sampleCardsResult.forEach((row) => {
        if (row.url && !sampleCardMap.has(row.url)) {
          sampleCardMap.set(row.url, row.contentData);
        }
      });

      // 4. Build result map
      const resultMap = new Map<string, UrlLibraryInfo>();

      urls.forEach((url) => {
        const urlLibraryCount = urlLibraryCountMap.get(url) || 0;
        const urlInLibrary = urlInLibraryMap?.get(url);
        const contentData = sampleCardMap.get(url);

        // Build metadata from contentData or create minimal metadata
        const metadata = contentData
          ? {
              url: contentData.url || url,
              title: contentData.title,
              description: contentData.description,
              author: contentData.author,
              publishedDate: contentData.publishedDate
                ? new Date(contentData.publishedDate)
                : undefined,
              siteName: contentData.siteName,
              imageUrl: contentData.imageUrl,
              type: contentData.type,
              retrievedAt: contentData.retrievedAt
                ? new Date(contentData.retrievedAt)
                : undefined,
              doi: contentData.doi,
              isbn: contentData.isbn,
            }
          : {
              url,
            };

        resultMap.set(url, {
          urlLibraryCount,
          urlInLibrary,
          metadata,
        });
      });

      return resultMap;
    } catch (error) {
      console.error('Error in getBatchUrlLibraryInfo:', error);
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
