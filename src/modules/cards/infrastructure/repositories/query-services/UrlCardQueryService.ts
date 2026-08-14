import {
  eq,
  desc,
  asc,
  count,
  countDistinct,
  inArray,
  and,
  isNotNull,
  sql,
  or,
  SQL,
} from 'drizzle-orm';
import { UrlType } from '../../../domain/value-objects/UrlType';
import { UrlCardView } from '../../../domain/ICardQueryRepository';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DID } from '../../../../atproto/domain/DID';
import { CollectionId } from '../../../domain/value-objects/CollectionId';
import {
  CardQueryOptions,
  PaginatedQueryResult,
  UrlCardQueryResultDTO,
  UrlCardViewDTO,
  LibraryForUrlDTO,
  CardSortField,
  SortOrder,
  UrlLibraryInfo,
  UrlRankingStats,
  UserActivityStats,
  SearchUrlsOptions,
  UrlSearchResultDTO,
} from '../../../domain/ICardQueryRepository';
import { cards } from '../schema/card.sql';
import { collections, collectionCards } from '../schema/collection.sql';
import { libraryMemberships } from '../schema/libraryMembership.sql';
import { publishedRecords } from '../schema/publishedRecord.sql';
import { connections } from '../schema/connection.sql';
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

      if (options.searchText && options.searchText.trim().length > 0) {
        const searchWords = options.searchText.trim().split(/\s+/);
        for (const word of searchWords) {
          const pattern = `%${word}%`;
          whereConditions.push(
            sql`(
              ${cards.contentData}->'metadata'->>'title' ILIKE ${pattern} OR
              ${cards.contentData}->'metadata'->>'description' ILIKE ${pattern} OR
              ${cards.url} ILIKE ${pattern}
            )`,
          );
        }
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

        // Filter out cards in collections if uncollected flag is set
        let filteredUrlCards = allUrlCardsResult;
        if (options.uncollected) {
          // Get all cardIds that are in collections added by this user
          const collectedCardIdsQuery = this.db
            .select({
              cardId: collectionCards.cardId,
            })
            .from(collectionCards)
            .where(eq(collectionCards.addedBy, userId));

          const collectedCardIdsResult = await collectedCardIdsQuery;
          const collectedCardIds = new Set(
            collectedCardIdsResult.map((row) => row.cardId),
          );

          // Filter out cards that are in collections
          filteredUrlCards = allUrlCardsResult.filter(
            (card) => !collectedCardIds.has(card.id),
          );
        }

        if (filteredUrlCards.length === 0) {
          return {
            items: [],
            totalCount: 0,
            hasMore: false,
          };
        }

        const urls = filteredUrlCards.map((card) => card.url || '');

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
        const cardsWithUrlLibraryCount = filteredUrlCards.map((card) => ({
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
            totalCount: filteredUrlCards.length,
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

        // Get connection counts for each URL
        // Query connections where URLs are sources
        const sourceConnectionCountsQuery = this.db
          .select({
            url: connections.sourceValue,
            count: count(),
          })
          .from(connections)
          .where(
            and(
              eq(connections.sourceType, 'URL'),
              inArray(connections.sourceValue, urls_paginated),
              eq(connections.targetType, 'URL'),
            ),
          )
          .groupBy(connections.sourceValue);

        // Query connections where URLs are targets
        const targetConnectionCountsQuery = this.db
          .select({
            url: connections.targetValue,
            count: count(),
          })
          .from(connections)
          .where(
            and(
              eq(connections.targetType, 'URL'),
              inArray(connections.targetValue, urls_paginated),
              eq(connections.sourceType, 'URL'),
            ),
          )
          .groupBy(connections.targetValue);

        const [sourceConnectionCounts, targetConnectionCounts] =
          await Promise.all([
            sourceConnectionCountsQuery,
            targetConnectionCountsQuery,
          ]);

        const urlConnectionCountMap = new Map<string, number>();
        sourceConnectionCounts.forEach((row) => {
          if (row.url) {
            urlConnectionCountMap.set(row.url, Number(row.count));
          }
        });
        targetConnectionCounts.forEach((row) => {
          if (row.url) {
            urlConnectionCountMap.set(
              row.url,
              (urlConnectionCountMap.get(row.url) || 0) + Number(row.count),
            );
          }
        });

        // Get URLs that calling user has connections with
        let urlIsConnectedMap: Map<string, boolean> | undefined;
        if (callingUserId) {
          urlIsConnectedMap = new Map();

          // Query for URLs where user's connections have them as source
          const userSourceConnectionsQuery = this.db
            .select({
              url: connections.sourceValue,
            })
            .from(connections)
            .where(
              and(
                eq(connections.curatorId, callingUserId),
                eq(connections.sourceType, 'URL'),
                inArray(connections.sourceValue, urls_paginated),
                eq(connections.targetType, 'URL'),
              ),
            );

          // Query for URLs where user's connections have them as target
          const userTargetConnectionsQuery = this.db
            .select({
              url: connections.targetValue,
            })
            .from(connections)
            .where(
              and(
                eq(connections.curatorId, callingUserId),
                eq(connections.targetType, 'URL'),
                inArray(connections.targetValue, urls_paginated),
                eq(connections.sourceType, 'URL'),
              ),
            );

          const [userSourceConnections, userTargetConnections] =
            await Promise.all([
              userSourceConnectionsQuery,
              userTargetConnectionsQuery,
            ]);

          urls_paginated.forEach((url) => urlIsConnectedMap!.set(url, false));
          [...userSourceConnections, ...userTargetConnections].forEach(
            (row) => {
              if (row.url) {
                urlIsConnectedMap!.set(row.url, true);
              }
            },
          );
        }

        const totalCount = filteredUrlCards.length;
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

          // Get connection stats from the maps
          const urlConnectionCount =
            urlConnectionCountMap.get(card.url || '') || 0;
          const urlIsConnected = urlIsConnectedMap?.get(card.url || '');

          return {
            id: card.id,
            authorId: card.authorId,
            url: card.url || '',
            uri: card.publishedRecordUri || undefined,
            contentData: card.contentData,
            libraryCount: card.libraryCount,
            urlLibraryCount,
            urlInLibrary,
            urlConnectionCount,
            urlIsConnected,
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
      // Add uncollected filter for standard sorting path
      const standardWhereConditions = [...whereConditions];
      if (options.uncollected) {
        standardWhereConditions.push(
          sql`NOT EXISTS (
            SELECT 1 FROM collection_cards
            WHERE collection_cards.card_id = ${cards.id}
            AND collection_cards.added_by = ${userId}
          )`,
        );
      }

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
        .where(and(...standardWhereConditions))
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

      // Get connection counts for each URL
      // Query connections where URLs are sources
      const sourceConnectionCountsQuery = this.db
        .select({
          url: connections.sourceValue,
          count: count(),
        })
        .from(connections)
        .where(
          and(
            eq(connections.sourceType, 'URL'),
            inArray(connections.sourceValue, urls),
            eq(connections.targetType, 'URL'),
          ),
        )
        .groupBy(connections.sourceValue);

      // Query connections where URLs are targets
      const targetConnectionCountsQuery = this.db
        .select({
          url: connections.targetValue,
          count: count(),
        })
        .from(connections)
        .where(
          and(
            eq(connections.targetType, 'URL'),
            inArray(connections.targetValue, urls),
            eq(connections.sourceType, 'URL'),
          ),
        )
        .groupBy(connections.targetValue);

      const [sourceConnectionCounts, targetConnectionCounts] =
        await Promise.all([
          sourceConnectionCountsQuery,
          targetConnectionCountsQuery,
        ]);

      const urlConnectionCountMap = new Map<string, number>();
      sourceConnectionCounts.forEach((row) => {
        if (row.url) {
          urlConnectionCountMap.set(row.url, Number(row.count));
        }
      });
      targetConnectionCounts.forEach((row) => {
        if (row.url) {
          urlConnectionCountMap.set(
            row.url,
            (urlConnectionCountMap.get(row.url) || 0) + Number(row.count),
          );
        }
      });

      // Get URLs that calling user has connections with
      let urlIsConnectedMap: Map<string, boolean> | undefined;
      if (callingUserId) {
        urlIsConnectedMap = new Map();

        // Query for URLs where user's connections have them as source
        const userSourceConnectionsQuery = this.db
          .select({
            url: connections.sourceValue,
          })
          .from(connections)
          .where(
            and(
              eq(connections.curatorId, callingUserId),
              eq(connections.sourceType, 'URL'),
              inArray(connections.sourceValue, urls),
              eq(connections.targetType, 'URL'),
            ),
          );

        // Query for URLs where user's connections have them as target
        const userTargetConnectionsQuery = this.db
          .select({
            url: connections.targetValue,
          })
          .from(connections)
          .where(
            and(
              eq(connections.curatorId, callingUserId),
              eq(connections.targetType, 'URL'),
              inArray(connections.targetValue, urls),
              eq(connections.sourceType, 'URL'),
            ),
          );

        const [userSourceConnections, userTargetConnections] =
          await Promise.all([
            userSourceConnectionsQuery,
            userTargetConnectionsQuery,
          ]);

        urls.forEach((url) => urlIsConnectedMap!.set(url, false));
        [...userSourceConnections, ...userTargetConnections].forEach((row) => {
          if (row.url) {
            urlIsConnectedMap!.set(row.url, true);
          }
        });
      }

      // Get total count
      const totalCountResult = await this.db
        .select({ count: count() })
        .from(cards)
        .where(and(...standardWhereConditions));

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

        // Get connection stats from the maps
        const urlConnectionCount =
          urlConnectionCountMap.get(card.url || '') || 0;
        const urlIsConnected = urlIsConnectedMap?.get(card.url || '');

        return {
          id: card.id,
          authorId: card.authorId,
          url: card.url || '',
          uri: card.publishedRecordUri || undefined,
          contentData: card.contentData,
          libraryCount: card.libraryCount,
          urlLibraryCount,
          urlInLibrary,
          urlConnectionCount,
          urlIsConnected,
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

      // Get connection count for this URL
      const urlConnectionCountQuery = this.db
        .select({
          count: count(),
        })
        .from(connections)
        .where(
          or(
            and(
              eq(connections.sourceType, 'URL'),
              eq(connections.sourceValue, card.url || ''),
            ),
            and(
              eq(connections.targetType, 'URL'),
              eq(connections.targetValue, card.url || ''),
            ),
          ),
        );

      const urlConnectionCountResult = await urlConnectionCountQuery;
      const urlConnectionCount =
        Number(urlConnectionCountResult[0]?.count) || 0;

      // Get urlIsConnected if callingUserId is provided
      let urlIsConnected: boolean | undefined;
      if (callingUserId) {
        const urlIsConnectedQuery = this.db
          .select({
            id: connections.id,
          })
          .from(connections)
          .where(
            and(
              eq(connections.curatorId, callingUserId),
              or(
                and(
                  eq(connections.sourceType, 'URL'),
                  eq(connections.sourceValue, card.url || ''),
                ),
                and(
                  eq(connections.targetType, 'URL'),
                  eq(connections.targetValue, card.url || ''),
                ),
              ),
            ),
          )
          .limit(1);

        const urlIsConnectedResult = await urlIsConnectedQuery;
        urlIsConnected = urlIsConnectedResult.length > 0;
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
        urlConnectionCount,
        urlIsConnected,
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

      // LIBRARY_COUNT sorting is a no-op here: every row shares the same URL,
      // so the URL-level library count is identical for all rows and ordering
      // falls through to the tiebreaker (updatedAt DESC) - the default sort.
      const orderByClause =
        sortBy === CardSortField.LIBRARY_COUNT
          ? desc(cards.updatedAt)
          : orderDirection(this.getSortColumn(sortBy));

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
        .orderBy(orderByClause)
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

      // Get connection counts for each URL (total connections where URL is source or target)
      // Query connections where URLs are sources
      const sourceConnectionCountsQuery = this.db
        .select({
          url: connections.sourceValue,
          count: count(),
        })
        .from(connections)
        .where(
          and(
            eq(connections.sourceType, 'URL'),
            inArray(connections.sourceValue, urls),
            eq(connections.targetType, 'URL'), // Only URL-to-URL connections
          ),
        )
        .groupBy(connections.sourceValue);

      // Query connections where URLs are targets
      const targetConnectionCountsQuery = this.db
        .select({
          url: connections.targetValue,
          count: count(),
        })
        .from(connections)
        .where(
          and(
            eq(connections.targetType, 'URL'),
            inArray(connections.targetValue, urls),
            eq(connections.sourceType, 'URL'), // Only URL-to-URL connections
          ),
        )
        .groupBy(connections.targetValue);

      const [sourceConnectionCounts, targetConnectionCounts] =
        await Promise.all([
          sourceConnectionCountsQuery,
          targetConnectionCountsQuery,
        ]);

      // Build map of URL to connection count (combining source and target counts)
      const urlConnectionCountMap = new Map<string, number>();
      sourceConnectionCounts.forEach((row) => {
        if (row.url) {
          urlConnectionCountMap.set(row.url, Number(row.count));
        }
      });
      targetConnectionCounts.forEach((row) => {
        if (row.url) {
          urlConnectionCountMap.set(
            row.url,
            (urlConnectionCountMap.get(row.url) || 0) + Number(row.count),
          );
        }
      });

      // Get URLs that calling user has connections with (if callingUserId provided)
      let urlIsConnectedMap: Map<string, boolean> | undefined;
      if (callingUserId) {
        urlIsConnectedMap = new Map();

        // Query for URLs where user's connections have them as source
        const userSourceConnectionsQuery = this.db
          .select({
            url: connections.sourceValue,
          })
          .from(connections)
          .where(
            and(
              eq(connections.curatorId, callingUserId),
              eq(connections.sourceType, 'URL'),
              inArray(connections.sourceValue, urls),
              eq(connections.targetType, 'URL'),
            ),
          );

        // Query for URLs where user's connections have them as target
        const userTargetConnectionsQuery = this.db
          .select({
            url: connections.targetValue,
          })
          .from(connections)
          .where(
            and(
              eq(connections.curatorId, callingUserId),
              eq(connections.targetType, 'URL'),
              inArray(connections.targetValue, urls),
              eq(connections.sourceType, 'URL'),
            ),
          );

        const [userSourceConnections, userTargetConnections] =
          await Promise.all([
            userSourceConnectionsQuery,
            userTargetConnectionsQuery,
          ]);

        // Mark URLs as connected if they appear in either source or target
        [...userSourceConnections, ...userTargetConnections].forEach((row) => {
          if (row.url) {
            urlIsConnectedMap!.set(row.url, true);
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

        // Get urlConnectionCount from map
        const urlConnectionCount =
          urlConnectionCountMap.get(card.url || '') || 0;

        // Get urlIsConnected from map
        const urlIsConnected = urlIsConnectedMap?.get(card.url || '');

        const rawCardData = {
          id: card.id,
          authorId: card.authorId,
          url: card.url || '',
          uri: card.publishedRecordUri || undefined,
          contentData: card.contentData,
          libraryCount: card.libraryCount,
          urlLibraryCount,
          urlInLibrary,
          urlConnectionCount,
          urlIsConnected,
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

  async getBatchUrlRankingStats(
    urls: string[],
  ): Promise<Map<string, UrlRankingStats>> {
    try {
      if (urls.length === 0) {
        return new Map();
      }

      const urlCardCountsQuery = this.db
        .select({
          url: cards.url,
          count: count(),
        })
        .from(cards)
        .where(and(eq(cards.type, CardTypeEnum.URL), inArray(cards.url, urls)))
        .groupBy(cards.url);

      const noteCountsQuery = this.db
        .select({
          url: cards.url,
          count: count(),
        })
        .from(cards)
        .where(and(eq(cards.type, CardTypeEnum.NOTE), inArray(cards.url, urls)))
        .groupBy(cards.url);

      const collectionCountsQuery = this.db
        .select({
          url: cards.url,
          count: countDistinct(collectionCards.collectionId),
        })
        .from(collectionCards)
        .innerJoin(cards, eq(collectionCards.cardId, cards.id))
        .where(and(eq(cards.type, CardTypeEnum.URL), inArray(cards.url, urls)))
        .groupBy(cards.url);

      const sourceConnectionCountsQuery = this.db
        .select({
          url: connections.sourceValue,
          count: count(),
        })
        .from(connections)
        .where(
          and(
            eq(connections.sourceType, 'URL'),
            inArray(connections.sourceValue, urls),
          ),
        )
        .groupBy(connections.sourceValue);

      const targetConnectionCountsQuery = this.db
        .select({
          url: connections.targetValue,
          count: count(),
        })
        .from(connections)
        .where(
          and(
            eq(connections.targetType, 'URL'),
            inArray(connections.targetValue, urls),
          ),
        )
        .groupBy(connections.targetValue);

      const [
        urlCardCounts,
        noteCounts,
        collectionCounts,
        sourceConnectionCounts,
        targetConnectionCounts,
      ] = await Promise.all([
        urlCardCountsQuery,
        noteCountsQuery,
        collectionCountsQuery,
        sourceConnectionCountsQuery,
        targetConnectionCountsQuery,
      ]);

      const resultMap = new Map<string, UrlRankingStats>();
      for (const url of urls) {
        resultMap.set(url, {
          urlCardCount: 0,
          noteCount: 0,
          collectionCount: 0,
          connectionCount: 0,
        });
      }

      urlCardCounts.forEach((row) => {
        if (row.url && resultMap.has(row.url)) {
          resultMap.get(row.url)!.urlCardCount = Number(row.count);
        }
      });
      noteCounts.forEach((row) => {
        if (row.url && resultMap.has(row.url)) {
          resultMap.get(row.url)!.noteCount = Number(row.count);
        }
      });
      collectionCounts.forEach((row) => {
        if (row.url && resultMap.has(row.url)) {
          resultMap.get(row.url)!.collectionCount = Number(row.count);
        }
      });
      sourceConnectionCounts.forEach((row) => {
        if (row.url && resultMap.has(row.url)) {
          resultMap.get(row.url)!.connectionCount += Number(row.count);
        }
      });
      targetConnectionCounts.forEach((row) => {
        if (row.url && resultMap.has(row.url)) {
          resultMap.get(row.url)!.connectionCount += Number(row.count);
        }
      });

      return resultMap;
    } catch (error) {
      console.error('Error in getBatchUrlRankingStats:', error);
      throw error;
    }
  }

  async getUsersForUrls(urls: string[]): Promise<string[]> {
    try {
      if (urls.length === 0) {
        return [];
      }

      const [cardAuthors, sourceCurators, targetCurators] = await Promise.all([
        this.db
          .selectDistinct({ userId: cards.authorId })
          .from(cards)
          .where(
            and(eq(cards.type, CardTypeEnum.URL), inArray(cards.url, urls)),
          ),
        this.db
          .selectDistinct({ userId: connections.curatorId })
          .from(connections)
          .where(
            and(
              eq(connections.sourceType, 'URL'),
              inArray(connections.sourceValue, urls),
            ),
          ),
        this.db
          .selectDistinct({ userId: connections.curatorId })
          .from(connections)
          .where(
            and(
              eq(connections.targetType, 'URL'),
              inArray(connections.targetValue, urls),
            ),
          ),
      ]);

      const userIds = new Set<string>();
      [...cardAuthors, ...sourceCurators, ...targetCurators].forEach((row) => {
        if (row.userId) {
          userIds.add(row.userId);
        }
      });

      return Array.from(userIds);
    } catch (error) {
      console.error('Error in getUsersForUrls:', error);
      throw error;
    }
  }

  async getBatchUserActivityStats(
    userIds: string[],
  ): Promise<Map<string, UserActivityStats>> {
    try {
      if (userIds.length === 0) {
        return new Map();
      }

      const [cardStats, collectionStats, collectionCardStats, connectionStats] =
        await Promise.all([
          this.db
            .select({
              userId: cards.authorId,
              count: count(),
              latest: sql<Date | null>`MAX(${cards.createdAt})`,
            })
            .from(cards)
            .where(inArray(cards.authorId, userIds))
            .groupBy(cards.authorId),
          this.db
            .select({
              userId: collections.authorId,
              count: count(),
            })
            .from(collections)
            .where(inArray(collections.authorId, userIds))
            .groupBy(collections.authorId),
          this.db
            .select({
              userId: collectionCards.addedBy,
              latest: sql<Date | null>`MAX(${collectionCards.addedAt})`,
            })
            .from(collectionCards)
            .where(inArray(collectionCards.addedBy, userIds))
            .groupBy(collectionCards.addedBy),
          this.db
            .select({
              userId: connections.curatorId,
              count: count(),
              latest: sql<Date | null>`MAX(${connections.createdAt})`,
            })
            .from(connections)
            .where(inArray(connections.curatorId, userIds))
            .groupBy(connections.curatorId),
        ]);

      const resultMap = new Map<string, UserActivityStats>();
      for (const userId of userIds) {
        resultMap.set(userId, {
          cardCount: 0,
          collectionCount: 0,
          connectionCount: 0,
          lastActivityAt: null,
        });
      }

      const updateLatest = (userId: string, latest: Date | null) => {
        if (!latest) return;
        const stats = resultMap.get(userId);
        if (!stats) return;
        const latestDate = new Date(latest);
        if (!stats.lastActivityAt || latestDate > stats.lastActivityAt) {
          stats.lastActivityAt = latestDate;
        }
      };

      cardStats.forEach((row) => {
        const stats = resultMap.get(row.userId);
        if (stats) {
          stats.cardCount = Number(row.count);
          updateLatest(row.userId, row.latest);
        }
      });
      collectionStats.forEach((row) => {
        const stats = resultMap.get(row.userId);
        if (stats) {
          stats.collectionCount = Number(row.count);
        }
      });
      collectionCardStats.forEach((row) => {
        updateLatest(row.userId, row.latest);
      });
      connectionStats.forEach((row) => {
        const stats = resultMap.get(row.userId);
        if (stats) {
          stats.connectionCount = Number(row.count);
          updateLatest(row.userId, row.latest);
        }
      });

      return resultMap;
    } catch (error) {
      console.error('Error in getBatchUserActivityStats:', error);
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

      // 3. Get connection counts for each URL (total connections where URL is source or target)
      // Query connections where URLs are sources
      const sourceConnectionCountsQuery = this.db
        .select({
          url: connections.sourceValue,
          count: count(),
        })
        .from(connections)
        .where(
          and(
            eq(connections.sourceType, 'URL'),
            inArray(connections.sourceValue, urls),
            eq(connections.targetType, 'URL'), // Only URL-to-URL connections
          ),
        )
        .groupBy(connections.sourceValue);

      // Query connections where URLs are targets
      const targetConnectionCountsQuery = this.db
        .select({
          url: connections.targetValue,
          count: count(),
        })
        .from(connections)
        .where(
          and(
            eq(connections.targetType, 'URL'),
            inArray(connections.targetValue, urls),
            eq(connections.sourceType, 'URL'), // Only URL-to-URL connections
          ),
        )
        .groupBy(connections.targetValue);

      const [sourceConnectionCounts, targetConnectionCounts] =
        await Promise.all([
          sourceConnectionCountsQuery,
          targetConnectionCountsQuery,
        ]);

      // Build map of URL to connection count (combining source and target counts)
      const urlConnectionCountMap = new Map<string, number>();
      sourceConnectionCounts.forEach((row) => {
        if (row.url) {
          urlConnectionCountMap.set(row.url, Number(row.count));
        }
      });
      targetConnectionCounts.forEach((row) => {
        if (row.url) {
          urlConnectionCountMap.set(
            row.url,
            (urlConnectionCountMap.get(row.url) || 0) + Number(row.count),
          );
        }
      });

      // 4. Get URLs that calling user has connections with (if callingUserId provided)
      let urlIsConnectedMap: Map<string, boolean> | undefined;
      if (callingUserId) {
        urlIsConnectedMap = new Map();

        // Query for URLs where user's connections have them as source
        const userSourceConnectionsQuery = this.db
          .select({
            url: connections.sourceValue,
          })
          .from(connections)
          .where(
            and(
              eq(connections.curatorId, callingUserId),
              eq(connections.sourceType, 'URL'),
              inArray(connections.sourceValue, urls),
              eq(connections.targetType, 'URL'),
            ),
          );

        // Query for URLs where user's connections have them as target
        const userTargetConnectionsQuery = this.db
          .select({
            url: connections.targetValue,
          })
          .from(connections)
          .where(
            and(
              eq(connections.curatorId, callingUserId),
              eq(connections.targetType, 'URL'),
              inArray(connections.targetValue, urls),
              eq(connections.sourceType, 'URL'),
            ),
          );

        const [userSourceConnections, userTargetConnections] =
          await Promise.all([
            userSourceConnectionsQuery,
            userTargetConnectionsQuery,
          ]);

        // Mark URLs as connected if they appear in either source or target
        [...userSourceConnections, ...userTargetConnections].forEach((row) => {
          if (row.url) {
            urlIsConnectedMap!.set(row.url, true);
          }
        });
      }

      // 5. Get sample card metadata for each URL (one card per URL)
      // DISTINCT ON keeps only the most recently updated card per URL
      const sampleCardsQuery = this.db
        .selectDistinctOn([cards.url], {
          url: cards.url,
          contentData: cards.contentData,
        })
        .from(cards)
        .where(and(eq(cards.type, CardTypeEnum.URL), inArray(cards.url, urls)))
        .orderBy(asc(cards.url), desc(cards.updatedAt));

      const sampleCardsResult = await sampleCardsQuery;

      // Build map of URL to sample card
      const sampleCardMap = new Map<string, any>();
      sampleCardsResult.forEach((row) => {
        if (row.url) {
          sampleCardMap.set(row.url, row.contentData);
        }
      });

      // 6. Build result map
      const resultMap = new Map<string, UrlLibraryInfo>();

      urls.forEach((url) => {
        const urlLibraryCount = urlLibraryCountMap.get(url) || 0;
        const urlInLibrary = urlInLibraryMap?.get(url);
        const urlConnectionCount = urlConnectionCountMap.get(url) || 0;
        const urlIsConnected = urlIsConnectedMap?.get(url);
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
          urlConnectionCount,
          urlIsConnected,
          metadata,
        });
      });

      return resultMap;
    } catch (error) {
      console.error('Error in getBatchUrlLibraryInfo:', error);
      throw error;
    }
  }

  async searchUrls(
    options: SearchUrlsOptions,
  ): Promise<PaginatedQueryResult<UrlSearchResultDTO>> {
    try {
      const {
        searchQuery,
        page,
        limit,
        sortBy,
        sortOrder,
        urlType,
        authorDid,
        collectionId,
      } = options;
      const offset = (page - 1) * limit;

      // Build search conditions only if search query is provided
      const searchConditions = [];
      if (searchQuery && searchQuery.trim().length > 0) {
        // Tokenize search query into words
        const searchWords = searchQuery.trim().split(/\s+/);

        // Build WHERE conditions for tokenized substring search
        searchConditions.push(
          ...searchWords.map((word) => {
            const pattern = `%${word}%`;
            return or(
              sql`${cards.contentData}->'metadata'->>'title' ILIKE ${pattern}`,
              sql`${cards.contentData}->'metadata'->>'description' ILIKE ${pattern}`,
              sql`${cards.url} ILIKE ${pattern}`,
            )!;
          }),
        );
      }

      // Base WHERE conditions
      const whereConditions = [
        eq(cards.type, CardTypeEnum.URL),
        ...searchConditions,
      ];

      // Add urlType filter if provided
      if (urlType) {
        whereConditions.push(eq(cards.urlType, urlType));
      }

      // Add authorDid filter if provided
      if (authorDid) {
        whereConditions.push(eq(cards.authorId, authorDid.value));
      }

      // Add collectionId filter if provided
      if (collectionId) {
        whereConditions.push(
          eq(collectionCards.collectionId, collectionId.getStringValue()),
        );
      }

      // Exclude cards without a URL (they were skipped by the previous
      // JS-side dedup and are ignored by COUNT(DISTINCT url))
      whereConditions.push(isNotNull(cards.url));

      const whereClause = and(...whereConditions);

      // Count distinct matching URLs (shared by all sort paths)
      const totalCountQuery = collectionId
        ? this.db
            .select({ count: countDistinct(cards.url) })
            .from(cards)
            .innerJoin(collectionCards, eq(cards.id, collectionCards.cardId))
            .where(whereClause)
        : this.db
            .select({ count: countDistinct(cards.url) })
            .from(cards)
            .where(whereClause);

      // Determine which column drives the per-URL representative card and sort
      const sortColumn =
        sortBy === CardSortField.CREATED_AT ? cards.createdAt : cards.updatedAt;
      const orderDirection = sortOrder === SortOrder.ASC ? asc : desc;

      // Deduplicate by URL in SQL. For LIBRARY_COUNT sorting the representative
      // card per URL is the most recently updated one; for other sorts it is
      // the first card in the requested sort direction.
      const distinctSelection = {
        url: cards.url,
        contentData: cards.contentData,
        createdAt: cards.createdAt,
        updatedAt: cards.updatedAt,
      };
      const distinctOrderBy =
        sortBy === CardSortField.LIBRARY_COUNT
          ? [asc(cards.url), desc(cards.updatedAt)]
          : [asc(cards.url), orderDirection(sortColumn)];

      const matchingUrls = (
        collectionId
          ? this.db
              .selectDistinctOn([cards.url], distinctSelection)
              .from(cards)
              .innerJoin(collectionCards, eq(cards.id, collectionCards.cardId))
              .where(whereClause)
              .orderBy(...distinctOrderBy)
          : this.db
              .selectDistinctOn([cards.url], distinctSelection)
              .from(cards)
              .where(whereClause)
              .orderBy(...distinctOrderBy)
      ).as('matching_urls');

      // Outer ORDER BY over the deduplicated URLs
      let outerOrderBy: SQL[];
      if (sortBy === CardSortField.LIBRARY_COUNT) {
        // URL-level library count (distinct users across all cards with the URL)
        const urlLibraryCountExpr = sql<number>`(
          SELECT COUNT(DISTINCT ${libraryMemberships.userId})
          FROM ${libraryMemberships}
          INNER JOIN ${cards} ON ${cards.id} = ${libraryMemberships.cardId}
          WHERE ${cards.type} = ${CardTypeEnum.URL}
            AND ${cards.url} = ${matchingUrls.url}
        )`;
        outerOrderBy = [
          sortOrder === SortOrder.ASC
            ? asc(urlLibraryCountExpr)
            : desc(urlLibraryCountExpr),
          desc(matchingUrls.updatedAt),
        ];
      } else {
        const outerSortColumn =
          sortBy === CardSortField.CREATED_AT
            ? matchingUrls.createdAt
            : matchingUrls.updatedAt;
        outerOrderBy = [orderDirection(outerSortColumn)];
      }

      const pageQuery = this.db
        .select({
          url: matchingUrls.url,
          contentData: matchingUrls.contentData,
          updatedAt: matchingUrls.updatedAt,
        })
        .from(matchingUrls)
        .orderBy(...outerOrderBy)
        .limit(limit)
        .offset(offset);

      const [pageResult, totalCountResult] = await Promise.all([
        pageQuery,
        totalCountQuery,
      ]);

      const totalCount = Number(totalCountResult[0]?.count || 0);

      // Map to result DTOs
      const items: UrlSearchResultDTO[] = pageResult.map((row) => ({
        url: row.url!,
        contentData: row.contentData,
        updatedAt: row.updatedAt,
      }));

      return {
        items,
        totalCount,
        hasMore: offset + items.length < totalCount,
      };
    } catch (error) {
      console.error('Error in searchUrls:', error);
      throw error;
    }
  }

  async getUrlAggregateStats(url: string): Promise<{
    libraryCount: number;
    noteCount: number;
  }> {
    try {
      // Get library count - count distinct users who have cards with this URL
      const libraryCountResult = await this.db
        .select({
          count: countDistinct(libraryMemberships.userId),
        })
        .from(cards)
        .innerJoin(libraryMemberships, eq(cards.id, libraryMemberships.cardId))
        .where(and(eq(cards.type, CardTypeEnum.URL), eq(cards.url, url)));

      const libraryCount = Number(libraryCountResult[0]?.count || 0);

      // Get note count - count NOTE cards that have a parent card with this URL
      // First get all URL cards with this URL
      const urlCardIds = await this.db
        .select({ id: cards.id })
        .from(cards)
        .where(and(eq(cards.type, CardTypeEnum.URL), eq(cards.url, url)));

      let noteCount = 0;
      if (urlCardIds.length > 0) {
        // Count NOTE cards that reference any of these URL cards
        const noteCountResult = await this.db
          .select({
            count: count(cards.id),
          })
          .from(cards)
          .where(
            and(
              eq(cards.type, CardTypeEnum.NOTE),
              inArray(
                cards.parentCardId,
                urlCardIds.map((c) => c.id),
              ),
            ),
          );

        noteCount = Number(noteCountResult[0]?.count || 0);
      }

      return {
        libraryCount,
        noteCount,
      };
    } catch (error) {
      console.error('Error in getUrlAggregateStats:', error);
      throw error;
    }
  }

  async getProfileCardStats(authorId: string): Promise<{
    urlCardCount: number;
  }> {
    try {
      // Get count of URL cards authored by this user
      const urlCardCountResult = await this.db
        .select({
          count: count(cards.id),
        })
        .from(cards)
        .where(
          and(eq(cards.authorId, authorId), eq(cards.type, CardTypeEnum.URL)),
        );

      const urlCardCount = Number(urlCardCountResult[0]?.count || 0);

      return {
        urlCardCount,
      };
    } catch (error) {
      console.error('Error in getProfileCardStats:', error);
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
