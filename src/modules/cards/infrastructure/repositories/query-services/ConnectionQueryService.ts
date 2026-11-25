import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  eq,
  and,
  or,
  inArray,
  SQL,
  SQLWrapper,
  desc,
  asc,
  count,
  sql,
} from 'drizzle-orm';
import {
  ConnectionQueryOptions,
  PaginatedConnectionQueryResult,
  ConnectionForUserRawDTO,
  ConnectionForAnnotationRawDTO,
  ConnectionSortField,
  SortOrder,
} from '../../../domain/IConnectionQueryRepository';
import { ConnectionTypeEnum } from '../../../domain/value-objects/ConnectionType';
import { connections } from '../schema/connection.sql';
import { publishedRecords } from '../schema/publishedRecord.sql';

export class ConnectionQueryService {
  constructor(private db: PostgresJsDatabase) {}

  async getConnectionsForUrlWithDirection(
    url: string,
    direction: 'forward' | 'backward' | 'both',
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUserRawDTO>> {
    const { page, limit, sortBy, sortOrder, connectionTypes } = options;
    const offset = (page - 1) * limit;

    // Only URL endpoints match the queried URL directly. CARD endpoints can
    // appear in results (as the other side of a matching connection), but a
    // passage's own connections are served by connectionsForAnnotation, not
    // by anchoring the card's URL here.
    const endpointMatches = (
      endpointType: SQLWrapper,
      endpointValue: SQLWrapper,
    ): SQL => sql`(${endpointType} = 'URL' AND ${endpointValue} = ${url})`;

    // Build WHERE conditions based on direction
    let whereConditions: SQL[] = [];

    if (direction === 'forward') {
      // URL is the source
      whereConditions.push(
        endpointMatches(connections.sourceType, connections.sourceValue),
      );
    } else if (direction === 'backward') {
      // URL is the target
      whereConditions.push(
        endpointMatches(connections.targetType, connections.targetValue),
      );
    } else {
      // both - URL is either source or target
      whereConditions.push(
        sql`(
          ${endpointMatches(connections.sourceType, connections.sourceValue)}
          OR
          ${endpointMatches(connections.targetType, connections.targetValue)}
        )`,
      );
    }

    // Add connection type filter if provided
    if (connectionTypes && connectionTypes.length > 0) {
      whereConditions.push(
        inArray(connections.connectionType, connectionTypes),
      );
    }

    // Combine WHERE conditions
    const whereClause =
      whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

    // Determine sort column and order
    const sortColumn =
      sortBy === ConnectionSortField.UPDATED_AT
        ? connections.updatedAt
        : connections.createdAt;

    const sortOrderFn = sortOrder === SortOrder.ASC ? asc : desc;

    // Execute main query with pagination and count query concurrently
    const [results, countResult] = await Promise.all([
      this.db
        .select({
          id: connections.id,
          curatorId: connections.curatorId,
          sourceType: connections.sourceType,
          sourceValue: connections.sourceValue,
          sourceUrlMetadata: connections.sourceUrlMetadata,
          targetType: connections.targetType,
          targetValue: connections.targetValue,
          targetUrlMetadata: connections.targetUrlMetadata,
          connectionType: connections.connectionType,
          note: connections.note,
          createdAt: connections.createdAt,
          updatedAt: connections.updatedAt,
        })
        .from(connections)
        .where(whereClause)
        .orderBy(sortOrderFn(sortColumn))
        .limit(limit)
        .offset(offset),
      this.db.select({ count: count() }).from(connections).where(whereClause),
    ]);

    const totalCount = countResult[0]?.count || 0;

    // Map results to DTOs with typed endpoints
    const items: ConnectionForUserRawDTO[] = results.map((row) => ({
      connection: {
        id: row.id,
        type: row.connectionType as ConnectionTypeEnum | undefined,
        note: row.note || undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        curatorId: row.curatorId,
      },
      source: {
        type: row.sourceType as 'URL' | 'CARD',
        value: row.sourceValue,
        urlMetadata: row.sourceUrlMetadata || undefined,
      },
      target: {
        type: row.targetType as 'URL' | 'CARD',
        value: row.targetValue,
        urlMetadata: row.targetUrlMetadata || undefined,
      },
    }));

    return {
      items,
      totalCount,
      hasMore: offset + results.length < totalCount,
    };
  }

  async getConnectionsForCards(
    cardIds: string[],
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForAnnotationRawDTO>> {
    const { page, limit, sortBy, sortOrder, connectionTypes } = options;
    const offset = (page - 1) * limit;

    if (cardIds.length === 0) {
      return { items: [], totalCount: 0, hasMore: false };
    }

    const whereConditions: SQL[] = [
      // Any of the given cards is an endpoint (source or target)
      or(
        and(
          eq(connections.sourceType, 'CARD'),
          inArray(connections.sourceValue, cardIds),
        )!,
        and(
          eq(connections.targetType, 'CARD'),
          inArray(connections.targetValue, cardIds),
        )!,
      )!,
    ];

    if (connectionTypes && connectionTypes.length > 0) {
      whereConditions.push(
        inArray(connections.connectionType, connectionTypes),
      );
    }

    const whereClause =
      whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

    const sortColumn =
      sortBy === ConnectionSortField.UPDATED_AT
        ? connections.updatedAt
        : connections.createdAt;

    const sortOrderFn = sortOrder === SortOrder.ASC ? asc : desc;

    const [results, countResult] = await Promise.all([
      this.db
        .select({
          id: connections.id,
          curatorId: connections.curatorId,
          sourceType: connections.sourceType,
          sourceValue: connections.sourceValue,
          targetType: connections.targetType,
          targetValue: connections.targetValue,
          connectionType: connections.connectionType,
          note: connections.note,
          createdAt: connections.createdAt,
          updatedAt: connections.updatedAt,
        })
        .from(connections)
        .where(whereClause)
        .orderBy(sortOrderFn(sortColumn))
        .limit(limit)
        .offset(offset),
      this.db.select({ count: count() }).from(connections).where(whereClause),
    ]);

    const totalCount = countResult[0]?.count || 0;

    const items: ConnectionForAnnotationRawDTO[] = results.map((row) => ({
      connection: {
        id: row.id,
        type: row.connectionType as ConnectionTypeEnum | undefined,
        note: row.note || undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        curatorId: row.curatorId,
      },
      source: {
        type: row.sourceType as 'URL' | 'CARD',
        value: row.sourceValue,
      },
      target: {
        type: row.targetType as 'URL' | 'CARD',
        value: row.targetValue,
      },
    }));

    return {
      items,
      totalCount,
      hasMore: offset + results.length < totalCount,
    };
  }

  async getConnectionsForUser(
    curatorId: string,
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUserRawDTO>> {
    const { page, limit, sortBy, sortOrder, connectionTypes } = options;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const whereConditions: SQL[] = [
      // Match curator — any endpoint type (URL or CARD)
      eq(connections.curatorId, curatorId),
    ];

    // Add connection type filter if provided
    if (connectionTypes && connectionTypes.length > 0) {
      whereConditions.push(
        inArray(connections.connectionType, connectionTypes),
      );
    }

    // Combine WHERE conditions
    const whereClause =
      whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

    // Determine sort column and order
    const sortColumn =
      sortBy === ConnectionSortField.UPDATED_AT
        ? connections.updatedAt
        : connections.createdAt;

    const sortOrderFn = sortOrder === SortOrder.ASC ? asc : desc;

    // Execute main query with pagination and count query concurrently
    const [results, countResult] = await Promise.all([
      this.db
        .select({
          id: connections.id,
          curatorId: connections.curatorId,
          sourceType: connections.sourceType,
          sourceValue: connections.sourceValue,
          sourceUrlMetadata: connections.sourceUrlMetadata,
          targetType: connections.targetType,
          targetValue: connections.targetValue,
          targetUrlMetadata: connections.targetUrlMetadata,
          connectionType: connections.connectionType,
          note: connections.note,
          createdAt: connections.createdAt,
          updatedAt: connections.updatedAt,
        })
        .from(connections)
        .where(whereClause)
        .orderBy(sortOrderFn(sortColumn))
        .limit(limit)
        .offset(offset),
      this.db.select({ count: count() }).from(connections).where(whereClause),
    ]);

    const totalCount = countResult[0]?.count || 0;

    // Map results to DTOs with typed endpoints
    const items: ConnectionForUserRawDTO[] = results.map((row) => ({
      connection: {
        id: row.id,
        type: row.connectionType as ConnectionTypeEnum | undefined,
        note: row.note || undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        curatorId: row.curatorId,
      },
      source: {
        type: row.sourceType as 'URL' | 'CARD',
        value: row.sourceValue,
        urlMetadata: row.sourceUrlMetadata || undefined,
      },
      target: {
        type: row.targetType as 'URL' | 'CARD',
        value: row.targetValue,
        urlMetadata: row.targetUrlMetadata || undefined,
      },
    }));

    return {
      items,
      totalCount,
      hasMore: offset + results.length < totalCount,
    };
  }

  async getConnectionStatsForCurator(curatorId: string): Promise<{
    total: number;
    byType: Map<ConnectionTypeEnum, number>;
  }> {
    try {
      // Get all connections created by curator grouped by type — any
      // endpoint type (URL or CARD) counts
      const stats = await this.db
        .select({
          connectionType: connections.connectionType,
          count: count(),
        })
        .from(connections)
        .where(eq(connections.curatorId, curatorId))
        .groupBy(connections.connectionType);

      // Process stats
      let total = 0;
      const byType = new Map<ConnectionTypeEnum, number>();
      stats.forEach((stat) => {
        const count = Number(stat.count);
        total += count;
        if (stat.connectionType) {
          byType.set(stat.connectionType as ConnectionTypeEnum, count);
        }
      });

      return {
        total,
        byType,
      };
    } catch (error) {
      console.error('Error in getConnectionStatsForCurator:', error);
      throw error;
    }
  }
}
