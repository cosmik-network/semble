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

// Raw DTO from repository - will be enriched in use case layer
export interface ConnectionForUrlDTO {
  connection: {
    id: string;
    type?: ConnectionTypeEnum;
    note?: string;
    createdAt: Date;
    updatedAt: Date;
    curatorId: string; // Will be enriched to profile in use case
  };
  url: string; // The other URL in the connection (target for forward, source for backward)
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
   * Get connections where the given URL is the source (forward connections)
   * Returns connections pointing FROM this URL TO other URLs
   */
  getForwardConnectionsForUrl(
    url: string,
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUrlDTO>>;

  /**
   * Get connections where the given URL is the target (backward connections)
   * Returns connections pointing FROM other URLs TO this URL
   */
  getBackwardConnectionsForUrl(
    url: string,
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUrlDTO>>;

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
   * Get connection statistics for a URL (counts by type for forward and backward)
   * Used for efficient aggregation without fetching full data
   */
  getConnectionStatsForUrl(url: string): Promise<{
    forwardTotal: number;
    backwardTotal: number;
    forwardByType: Map<ConnectionTypeEnum, number>;
    backwardByType: Map<ConnectionTypeEnum, number>;
  }>;

  /**
   * Get connection statistics for a curator (total count and breakdown by type)
   * Used for efficient aggregation without fetching full data
   */
  getConnectionStatsForCurator(curatorId: string): Promise<{
    total: number;
    byType: Map<ConnectionTypeEnum, number>;
  }>;
}
