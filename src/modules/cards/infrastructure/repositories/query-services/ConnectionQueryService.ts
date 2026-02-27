import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, inArray, SQL, desc, asc, count } from 'drizzle-orm';
import {
  ConnectionQueryOptions,
  PaginatedConnectionQueryResult,
  ConnectionForUrlDTO,
  ConnectionSortField,
  SortOrder,
} from '../../../domain/IConnectionQueryRepository';
import { ConnectionTypeEnum } from '../../../domain/value-objects/ConnectionType';
import { connections } from '../schema/connection.sql';
import { publishedRecords } from '../schema/publishedRecord.sql';

export class ConnectionQueryService {
  constructor(private db: PostgresJsDatabase) {}

  async getForwardConnectionsForUrl(
    url: string,
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUrlDTO>> {
    return this.getConnectionsForUrl(url, 'source', options);
  }

  async getBackwardConnectionsForUrl(
    url: string,
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUrlDTO>> {
    return this.getConnectionsForUrl(url, 'target', options);
  }

  private async getConnectionsForUrl(
    url: string,
    direction: 'source' | 'target',
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUrlDTO>> {
    const { page, limit, sortBy, sortOrder, connectionTypes } = options;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const whereConditions: SQL[] = [
      // Match the URL in the specified direction
      direction === 'source'
        ? and(
            eq(connections.sourceType, 'URL'),
            eq(connections.sourceValue, url),
            eq(connections.targetType, 'URL'), // Only URL-to-URL connections
          )!
        : and(
            eq(connections.targetType, 'URL'),
            eq(connections.targetValue, url),
            eq(connections.sourceType, 'URL'), // Only URL-to-URL connections
          )!,
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

    // Execute main query with pagination
    const results = await this.db
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
      .offset(offset);

    // Execute count query for total count
    const countResult = await this.db
      .select({ count: count() })
      .from(connections)
      .where(whereClause);

    const totalCount = countResult[0]?.count || 0;

    // Map results to DTOs
    const items: ConnectionForUrlDTO[] = results.map((row) => ({
      connection: {
        id: row.id,
        type: row.connectionType as ConnectionTypeEnum | undefined,
        note: row.note || undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        curatorId: row.curatorId,
      },
      // Return the URL from the opposite direction
      url: direction === 'source' ? row.targetValue : row.sourceValue,
    }));

    return {
      items,
      totalCount,
      hasMore: offset + results.length < totalCount,
    };
  }
}
