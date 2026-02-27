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
}
