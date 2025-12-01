import { eq, desc, asc, count, countDistinct, inArray, and } from 'drizzle-orm';
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
} from '../../../domain/ICardQueryRepository';
import { cards } from '../schema/card.sql';
import { collections, collectionCards } from '../schema/collection.sql';
import { libraryMemberships } from '../schema/libraryMembership.sql';
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

      // For LIBRARY_COUNT sorting, we need to handle urlLibraryCount calculation and sorting separately
      if (sortBy === CardSortField.LIBRARY_COUNT) {
        // Get all URL cards for the user first
        const allUrlCardsQuery = this.db
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
          .where(
            and(eq(cards.authorId, userId), eq(cards.type, CardTypeEnum.URL)),
          );

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
          contentData: cards.contentData,
          libraryCount: cards.libraryCount,
          createdAt: cards.createdAt,
          updatedAt: cards.updatedAt,
        })
        .from(cards)
        .where(
          and(eq(cards.authorId, userId), eq(cards.type, CardTypeEnum.URL)),
        )
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
        .where(
          and(eq(cards.authorId, userId), eq(cards.type, CardTypeEnum.URL)),
        );

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
          contentData: cards.contentData,
          libraryCount: cards.libraryCount,
          createdAt: cards.createdAt,
          updatedAt: cards.updatedAt,
        })
        .from(cards)
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
                thumbnailUrl: lib.contentData?.metadata?.imageUrl,
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
          contentData: cards.contentData,
          libraryCount: cards.libraryCount,
          createdAt: cards.createdAt,
          updatedAt: cards.updatedAt,
        })
        .from(libraryMemberships)
        .innerJoin(cards, eq(libraryMemberships.cardId, cards.id))
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
            cardContent: {
              url: lib.contentData?.url,
              title: lib.contentData?.metadata?.title,
              description: lib.contentData?.metadata?.description,
              author: lib.contentData?.metadata?.author,
              thumbnailUrl: lib.contentData?.metadata?.imageUrl,
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
          contentData: cards.contentData,
          libraryCount: cards.libraryCount,
          createdAt: cards.createdAt,
          updatedAt: cards.updatedAt,
        })
        .from(cards)
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
