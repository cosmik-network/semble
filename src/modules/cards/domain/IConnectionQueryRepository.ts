import { ConnectionTypeEnum } from './value-objects/ConnectionType';

export interface ConnectionQueryOptions {
  page: number;
  limit: number;
  sortBy: ConnectionSortField;
  sortOrder: SortOrder;
  connectionTypes?: ConnectionTypeEnum[]; // Optional filter - undefined/empty = all types
}

export interface PaginatedConnectionQueryResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
}

export enum ConnectionSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

// DTO for curator's connections - includes both source and target URLs
export interface ConnectionForUserDTO {
  connection: {
    id: string;
    type?: ConnectionTypeEnum;
    note?: string;
    createdAt: Date;
    updatedAt: Date;
    curatorId: string;
  };
  sourceUrl: string;
  sourceUrlMetadata?: any; // JSONB metadata from database
  targetUrl: string;
  targetUrlMetadata?: any; // JSONB metadata from database
}

export interface IConnectionQueryRepository {
  /**
   * Get connections for a URL with optional direction filtering
   * Returns connections with both source and target URLs
   * @param url - The URL to get connections for
   * @param direction - 'forward' (source), 'backward' (target), or 'both' (either)
   * @param options - Pagination, sorting, and filtering options
   */
  getConnectionsForUrl(
    url: string,
    direction: 'forward' | 'backward' | 'both',
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUserDTO>>;

  /**
   * Get all connections created by a specific curator
   * Returns connections with both source and target URLs
   */
  getConnectionsForUser(
    curatorId: string,
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUserDTO>>;

  /**
   * Get connection statistics for a curator (total count and breakdown by type)
   * Used for efficient aggregation without fetching full data
   */
  getConnectionStatsForCurator(curatorId: string): Promise<{
    total: number;
    byType: Map<ConnectionTypeEnum, number>;
  }>;
}
