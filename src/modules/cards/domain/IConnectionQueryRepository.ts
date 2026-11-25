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

// DTO for a curator's connections with typed endpoints - CARD endpoints
// carry their stored card id; URL endpoints carry stored metadata when the
// connection row has it
export interface ConnectionForUserRawDTO {
  connection: {
    id: string;
    type?: ConnectionTypeEnum;
    note?: string;
    createdAt: Date;
    updatedAt: Date;
    curatorId: string;
  };
  source: { type: 'URL' | 'CARD'; value: string; urlMetadata?: any };
  target: { type: 'URL' | 'CARD'; value: string; urlMetadata?: any };
}

// DTO for a connection with a card endpoint — source/target carry their
// stored type ('URL' | 'CARD') and raw value (URL string or card id)
export interface ConnectionForAnnotationRawDTO {
  connection: {
    id: string;
    type?: ConnectionTypeEnum;
    note?: string;
    createdAt: Date;
    updatedAt: Date;
    curatorId: string;
  };
  source: { type: 'URL' | 'CARD'; value: string };
  target: { type: 'URL' | 'CARD'; value: string };
}

export interface IConnectionQueryRepository {
  /**
   * Get connections for a URL with optional direction filtering
   * Returns connections with typed endpoints - only URL endpoints match the
   * queried URL (a passage's own connections are served by
   * getConnectionsForCards / connectionsForAnnotation). CARD endpoints can
   * appear in results as the other side of a matching connection.
   * @param url - The URL to get connections for
   * @param direction - 'forward' (source), 'backward' (target), or 'both' (either)
   * @param options - Pagination, sorting, and filtering options
   */
  getConnectionsForUrl(
    url: string,
    direction: 'forward' | 'backward' | 'both',
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUserRawDTO>>;

  /**
   * Get connections where any of the given cards is an endpoint (source or
   * target). Endpoints carry their stored type so card references can be
   * resolved by the caller.
   */
  getConnectionsForCards(
    cardIds: string[],
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForAnnotationRawDTO>>;

  /**
   * Get all connections created by a specific curator
   * Returns connections with typed endpoints - CARD endpoints carry their
   * card id for the caller to resolve
   */
  getConnectionsForUser(
    curatorId: string,
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUserRawDTO>>;

  /**
   * Get connection statistics for a curator (total count and breakdown by type)
   * Used for efficient aggregation without fetching full data
   */
  getConnectionStatsForCurator(curatorId: string): Promise<{
    total: number;
    byType: Map<ConnectionTypeEnum, number>;
  }>;

  /**
   * Whether the curator has any connection where one of the given cards is an
   * endpoint (source or target). Used for viewer-relative connect state on
   * annotation cards.
   */
  hasConnectionForCards(curatorId: string, cardIds: string[]): Promise<boolean>;
}
