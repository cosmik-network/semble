import {
  eq,
  desc,
  asc,
  count,
  sql,
  or,
  ilike,
  and,
  inArray,
} from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  ICollectionQueryRepository,
  CollectionQueryOptions,
  PaginatedQueryResult,
  CollectionQueryResultDTO,
  CollectionSortField,
  SortOrder,
  CollectionContainingCardDTO,
  CollectionForUrlRawDTO,
  CollectionForUrlQueryOptions,
  SearchCollectionsOptions,
  GetOpenCollectionsWithContributorOptions,
} from '../../domain/ICollectionQueryRepository';
import { collections, collectionCards } from './schema/collection.sql';
import { publishedRecords } from './schema/publishedRecord.sql';
import { cards } from './schema/card.sql';
import { CollectionMapper } from './mappers/CollectionMapper';
import { CardTypeEnum } from '../../domain/value-objects/CardType';

export class DrizzleCollectionQueryRepository
  implements ICollectionQueryRepository
{
  constructor(private db: PostgresJsDatabase) {}

  async findByCreator(
    curatorId: string,
    options: CollectionQueryOptions,
  ): Promise<PaginatedQueryResult<CollectionQueryResultDTO>> {
    try {
      const { page, limit, sortBy, sortOrder, searchText } = options;
      const offset = (page - 1) * limit;

      // Build the sort order
      const orderDirection = sortOrder === SortOrder.ASC ? asc : desc;

      // Build where conditions
      const whereConditions = [eq(collections.authorId, curatorId)];

      // Add search condition if searchText is provided
      if (searchText && searchText.trim()) {
        const searchTerm = `%${searchText.trim()}%`;
        whereConditions.push(
          or(
            ilike(collections.name, searchTerm),
            ilike(collections.description, searchTerm),
          )!,
        );
      }

      // Simple query: get collections with their stored card counts and URIs
      const collectionsQuery = this.db
        .select({
          id: collections.id,
          name: collections.name,
          description: collections.description,
          accessType: collections.accessType,
          createdAt: collections.createdAt,
          updatedAt: collections.updatedAt,
          authorId: collections.authorId,
          cardCount: collections.cardCount,
          uri: publishedRecords.uri,
        })
        .from(collections)
        .leftJoin(
          publishedRecords,
          eq(collections.publishedRecordId, publishedRecords.id),
        )
        .where(
          sql`${whereConditions.reduce((acc, condition, index) =>
            index === 0 ? condition : sql`${acc} AND ${condition}`,
          )}`,
        )
        .orderBy(orderDirection(this.getSortColumn(sortBy)))
        .limit(limit)
        .offset(offset);

      const collectionsResult = await collectionsQuery;

      // Get total count with same search conditions
      const totalCountResult = await this.db
        .select({ count: count() })
        .from(collections)
        .where(
          sql`${whereConditions.reduce((acc, condition, index) =>
            index === 0 ? condition : sql`${acc} AND ${condition}`,
          )}`,
        );

      const totalCount = totalCountResult[0]?.count || 0;
      const hasMore = offset + collectionsResult.length < totalCount;

      // Map to DTOs
      const items = collectionsResult.map((raw) =>
        CollectionMapper.toQueryResult({
          id: raw.id,
          uri: raw.uri,
          name: raw.name,
          description: raw.description,
          accessType: raw.accessType,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
          authorId: raw.authorId,
          cardCount: raw.cardCount,
        }),
      );

      return {
        items,
        totalCount,
        hasMore,
      };
    } catch (error) {
      console.error('Error in findByCreator:', error);
      throw error;
    }
  }

  async getCollectionsContainingCardForUser(
    cardId: string,
    curatorId: string,
  ): Promise<CollectionContainingCardDTO[]> {
    try {
      // Find collections authored by this curator that contain this card
      const collectionResults = await this.db
        .select({
          id: collections.id,
          name: collections.name,
          description: collections.description,
          uri: publishedRecords.uri,
        })
        .from(collections)
        .leftJoin(
          publishedRecords,
          eq(collections.publishedRecordId, publishedRecords.id),
        )
        .innerJoin(
          collectionCards,
          eq(collections.id, collectionCards.collectionId),
        )
        .where(
          and(
            eq(collections.authorId, curatorId),
            eq(collectionCards.cardId, cardId),
          ),
        )
        .orderBy(asc(collections.name));

      return collectionResults.map((result) => ({
        id: result.id,
        uri: result.uri || undefined,
        name: result.name,
        description: result.description || undefined,
      }));
    } catch (error) {
      console.error('Error in getCollectionsContainingCardForUser:', error);
      throw error;
    }
  }

  async getCollectionsWithUrl(
    url: string,
    options: CollectionForUrlQueryOptions,
  ): Promise<PaginatedQueryResult<CollectionForUrlRawDTO>> {
    try {
      const { page, limit, sortBy, sortOrder } = options;
      const offset = (page - 1) * limit;

      // Build the sort order
      const orderDirection = sortOrder === SortOrder.ASC ? asc : desc;

      // Find all URL cards with this URL
      const urlCardsQuery = this.db
        .select({
          id: cards.id,
        })
        .from(cards)
        .where(and(eq(cards.url, url), eq(cards.type, CardTypeEnum.URL)));

      const urlCardsResult = await urlCardsQuery;

      if (urlCardsResult.length === 0) {
        return {
          items: [],
          totalCount: 0,
          hasMore: false,
        };
      }

      const cardIds = urlCardsResult.map((card) => card.id);

      // Find all collections that contain any of these cards with pagination and sorting
      const collectionsQuery = this.db
        .selectDistinct({
          id: collections.id,
          name: collections.name,
          description: collections.description,
          accessType: collections.accessType,
          authorId: collections.authorId,
          uri: publishedRecords.uri,
          createdAt: collections.createdAt,
          updatedAt: collections.updatedAt,
          cardCount: collections.cardCount,
        })
        .from(collections)
        .leftJoin(
          publishedRecords,
          eq(collections.publishedRecordId, publishedRecords.id),
        )
        .innerJoin(
          collectionCards,
          eq(collections.id, collectionCards.collectionId),
        )
        .where(inArray(collectionCards.cardId, cardIds))
        .orderBy(orderDirection(this.getSortColumn(sortBy)))
        .limit(limit)
        .offset(offset);

      const collectionsResult = await collectionsQuery;

      // Get total count of distinct collections
      const totalCountQuery = this.db
        .selectDistinct({
          id: collections.id,
        })
        .from(collections)
        .innerJoin(
          collectionCards,
          eq(collections.id, collectionCards.collectionId),
        )
        .where(inArray(collectionCards.cardId, cardIds));

      const totalCountResult = await totalCountQuery;
      const totalCount = totalCountResult.length;
      const hasMore = offset + collectionsResult.length < totalCount;

      const items = collectionsResult.map((result) => ({
        id: result.id,
        uri: result.uri || undefined,
        name: result.name,
        description: result.description || undefined,
        accessType: result.accessType,
        authorId: result.authorId,
      }));

      return {
        items,
        totalCount,
        hasMore,
      };
    } catch (error) {
      console.error('Error in getCollectionsWithUrl:', error);
      throw error;
    }
  }

  async searchCollections(
    options: SearchCollectionsOptions,
  ): Promise<PaginatedQueryResult<CollectionQueryResultDTO>> {
    try {
      const {
        page,
        limit,
        sortBy,
        sortOrder,
        searchText,
        authorId,
        accessType,
      } = options;
      const offset = (page - 1) * limit;

      // Build the sort order
      const orderDirection = sortOrder === SortOrder.ASC ? asc : desc;

      // Build where conditions
      const whereConditions = [];

      // Add author filter if provided
      if (authorId) {
        whereConditions.push(eq(collections.authorId, authorId));
      }

      // Add access type filter if provided
      if (accessType) {
        whereConditions.push(eq(collections.accessType, accessType));
      }

      // Add tokenized search condition if searchText is provided
      if (searchText && searchText.trim()) {
        const searchWords = searchText.trim().split(/\s+/);
        const searchConditions = searchWords.map(
          (word) =>
            or(
              ilike(collections.name, `%${word}%`),
              ilike(collections.description, `%${word}%`),
            )!,
        );

        // All words must be found (AND logic)
        whereConditions.push(and(...searchConditions)!);
      }

      // Build the where clause
      const whereClause =
        whereConditions.length > 0
          ? sql`${whereConditions.reduce((acc, condition, index) =>
              index === 0 ? condition : sql`${acc} AND ${condition}`,
            )}`
          : sql`1=1`; // Always true when no conditions

      // Query collections with their stored card counts and URIs
      const collectionsQuery = this.db
        .select({
          id: collections.id,
          name: collections.name,
          description: collections.description,
          accessType: collections.accessType,
          createdAt: collections.createdAt,
          updatedAt: collections.updatedAt,
          authorId: collections.authorId,
          cardCount: collections.cardCount,
          uri: publishedRecords.uri,
        })
        .from(collections)
        .leftJoin(
          publishedRecords,
          eq(collections.publishedRecordId, publishedRecords.id),
        )
        .where(whereClause)
        .orderBy(orderDirection(this.getSortColumn(sortBy)))
        .limit(limit)
        .offset(offset);

      const collectionsResult = await collectionsQuery;

      // Get total count with same search conditions
      const totalCountResult = await this.db
        .select({ count: count() })
        .from(collections)
        .where(whereClause);

      const totalCount = totalCountResult[0]?.count || 0;
      const hasMore = offset + collectionsResult.length < totalCount;

      // Map to DTOs
      const items = collectionsResult.map((raw) =>
        CollectionMapper.toQueryResult({
          id: raw.id,
          uri: raw.uri,
          name: raw.name,
          description: raw.description,
          accessType: raw.accessType,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
          authorId: raw.authorId,
          cardCount: raw.cardCount,
        }),
      );

      return {
        items,
        totalCount,
        hasMore,
      };
    } catch (error) {
      console.error('Error in searchCollections:', error);
      throw error;
    }
  }

  async getOpenCollectionsWithContributor(
    options: GetOpenCollectionsWithContributorOptions,
  ): Promise<PaginatedQueryResult<CollectionQueryResultDTO>> {
    try {
      const { contributorId, page, limit, sortBy, sortOrder } = options;
      const offset = (page - 1) * limit;

      // Build the sort order
      const orderDirection = sortOrder === SortOrder.ASC ? asc : desc;

      // Get collections where:
      // 1. User has added cards (via collection_cards.addedBy)
      // 2. User is NOT the author (collections.authorId != contributorId)
      // 3. Collection is OPEN (collections.accessType = 'OPEN')
      // Sort by most recent contribution (addedAt DESC) as primary sort

      const collectionsQuery = this.db
        .selectDistinct({
          id: collections.id,
          name: collections.name,
          description: collections.description,
          accessType: collections.accessType,
          createdAt: collections.createdAt,
          updatedAt: collections.updatedAt,
          authorId: collections.authorId,
          cardCount: collections.cardCount,
          uri: publishedRecords.uri,
          // Get the most recent contribution date for sorting
          lastContributionDate: sql<Date>`MAX(${collectionCards.addedAt})`.as(
            'last_contribution_date',
          ),
        })
        .from(collections)
        .leftJoin(
          publishedRecords,
          eq(collections.publishedRecordId, publishedRecords.id),
        )
        .innerJoin(
          collectionCards,
          eq(collections.id, collectionCards.collectionId),
        )
        .where(
          and(
            eq(collectionCards.addedBy, contributorId),
            sql`${collections.authorId} != ${contributorId}`, // Not the author
            eq(collections.accessType, 'OPEN'),
          ),
        )
        .groupBy(
          collections.id,
          collections.name,
          collections.description,
          collections.accessType,
          collections.createdAt,
          collections.updatedAt,
          collections.authorId,
          collections.cardCount,
          publishedRecords.uri,
        )
        .orderBy(
          // Primary sort: by most recent contribution (addedAt DESC)
          desc(sql`MAX(${collectionCards.addedAt})`),
          // Secondary sort: by the specified field
          orderDirection(this.getSortColumn(sortBy)),
        )
        .limit(limit)
        .offset(offset);

      const collectionsResult = await collectionsQuery;

      // Get total count with same conditions
      const totalCountQuery = this.db
        .selectDistinct({
          id: collections.id,
        })
        .from(collections)
        .innerJoin(
          collectionCards,
          eq(collections.id, collectionCards.collectionId),
        )
        .where(
          and(
            eq(collectionCards.addedBy, contributorId),
            sql`${collections.authorId} != ${contributorId}`,
            eq(collections.accessType, 'OPEN'),
          ),
        );

      const totalCountResult = await totalCountQuery;
      const totalCount = totalCountResult.length;
      const hasMore = offset + collectionsResult.length < totalCount;

      // Map to DTOs
      const items = collectionsResult.map((raw) =>
        CollectionMapper.toQueryResult({
          id: raw.id,
          uri: raw.uri,
          name: raw.name,
          description: raw.description,
          accessType: raw.accessType,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
          authorId: raw.authorId,
          cardCount: raw.cardCount,
        }),
      );

      return {
        items,
        totalCount,
        hasMore,
      };
    } catch (error) {
      console.error('Error in getOpenCollectionsWithContributor:', error);
      throw error;
    }
  }

  private getSortColumn(sortBy: CollectionSortField) {
    switch (sortBy) {
      case CollectionSortField.NAME:
        return collections.name;
      case CollectionSortField.CREATED_AT:
        return collections.createdAt;
      case CollectionSortField.UPDATED_AT:
        return collections.updatedAt;
      case CollectionSortField.CARD_COUNT:
        return collections.cardCount;
      default:
        return collections.name;
    }
  }
}
