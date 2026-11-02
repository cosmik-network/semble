import {
  IConnectionQueryRepository,
  ConnectionQueryOptions,
  PaginatedConnectionQueryResult,
  ConnectionForUserDTO,
  ConnectionSortField,
  SortOrder,
} from '../../domain/IConnectionQueryRepository';
import { InMemoryConnectionRepository } from './InMemoryConnectionRepository';
import { UrlOrCardIdType } from '../../domain/value-objects/UrlOrCardId';
import { ConnectionTypeEnum } from '../../domain/value-objects/ConnectionType';

export class InMemoryConnectionQueryRepository implements IConnectionQueryRepository {
  constructor(private connectionRepository: InMemoryConnectionRepository) {}

  async getConnectionsForUrl(
    url: string,
    direction: 'forward' | 'backward' | 'both',
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUserDTO>> {
    const { page, limit, sortBy, sortOrder, connectionTypes } = options;

    // Get all connections from the repository
    const allConnections = this.connectionRepository.getAllConnections();

    // Filter connections based on direction and URL type
    let filteredConnections = allConnections.filter((connection) => {
      const isSourceMatch =
        connection.source.type === UrlOrCardIdType.URL &&
        connection.source.stringValue === url;
      const isTargetMatch =
        connection.target.type === UrlOrCardIdType.URL &&
        connection.target.stringValue === url;
      const bothUrlToUrl =
        connection.source.type === UrlOrCardIdType.URL &&
        connection.target.type === UrlOrCardIdType.URL;

      if (direction === 'forward') {
        return isSourceMatch && bothUrlToUrl;
      } else if (direction === 'backward') {
        return isTargetMatch && bothUrlToUrl;
      } else {
        // both
        return (isSourceMatch || isTargetMatch) && bothUrlToUrl;
      }
    });

    // Apply connection type filter if provided
    if (connectionTypes && connectionTypes.length > 0) {
      filteredConnections = filteredConnections.filter((connection) =>
        connection.type
          ? connectionTypes.includes(connection.type.value)
          : false,
      );
    }

    // Sort connections
    filteredConnections.sort((a, b) => {
      const dateA =
        sortBy === ConnectionSortField.UPDATED_AT ? a.updatedAt : a.createdAt;
      const dateB =
        sortBy === ConnectionSortField.UPDATED_AT ? b.updatedAt : b.createdAt;

      const comparison = dateA.getTime() - dateB.getTime();
      return sortOrder === SortOrder.ASC ? comparison : -comparison;
    });

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedConnections = filteredConnections.slice(
      offset,
      offset + limit,
    );

    // Map to DTOs with both source and target
    const items: ConnectionForUserDTO[] = paginatedConnections.map(
      (connection) => ({
        connection: {
          id: connection.connectionId.getStringValue(),
          type: connection.type?.value,
          note: connection.note?.value,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt,
          curatorId: connection.curatorId.value,
        },
        sourceUrl: connection.source.stringValue,
        targetUrl: connection.target.stringValue,
      }),
    );

    return {
      items,
      totalCount: filteredConnections.length,
      hasMore:
        offset + paginatedConnections.length < filteredConnections.length,
    };
  }

  async getConnectionsForUser(
    curatorId: string,
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUserDTO>> {
    const { page, limit, sortBy, sortOrder, connectionTypes } = options;

    // Get all connections from the repository
    const allConnections = this.connectionRepository.getAllConnections();

    // Filter connections by curator and URL-to-URL type
    let filteredConnections = allConnections.filter((connection) => {
      return (
        connection.curatorId.value === curatorId &&
        connection.source.type === UrlOrCardIdType.URL &&
        connection.target.type === UrlOrCardIdType.URL
      );
    });

    // Apply connection type filter if provided
    if (connectionTypes && connectionTypes.length > 0) {
      filteredConnections = filteredConnections.filter((connection) =>
        connection.type
          ? connectionTypes.includes(connection.type.value)
          : false,
      );
    }

    // Sort connections
    filteredConnections.sort((a, b) => {
      const dateA =
        sortBy === ConnectionSortField.UPDATED_AT ? a.updatedAt : a.createdAt;
      const dateB =
        sortBy === ConnectionSortField.UPDATED_AT ? b.updatedAt : b.createdAt;

      const comparison = dateA.getTime() - dateB.getTime();
      return sortOrder === SortOrder.ASC ? comparison : -comparison;
    });

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedConnections = filteredConnections.slice(
      offset,
      offset + limit,
    );

    // Map to DTOs
    const items: ConnectionForUserDTO[] = paginatedConnections.map(
      (connection) => ({
        connection: {
          id: connection.connectionId.getStringValue(),
          type: connection.type?.value,
          note: connection.note?.value,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt,
          curatorId: connection.curatorId.value,
        },
        sourceUrl: connection.source.stringValue,
        targetUrl: connection.target.stringValue,
      }),
    );

    return {
      items,
      totalCount: filteredConnections.length,
      hasMore:
        offset + paginatedConnections.length < filteredConnections.length,
    };
  }

  async getConnectionStatsForCurator(curatorId: string): Promise<{
    total: number;
    byType: Map<ConnectionTypeEnum, number>;
  }> {
    const allConnections = this.connectionRepository.getAllConnections();

    // Get all URL-to-URL connections created by this curator
    const curatorConnections = allConnections.filter(
      (connection) =>
        connection.curatorId.value === curatorId &&
        connection.source.type === UrlOrCardIdType.URL &&
        connection.target.type === UrlOrCardIdType.URL,
    );

    // Count by type
    const byType = new Map<ConnectionTypeEnum, number>();
    curatorConnections.forEach((connection) => {
      if (connection.type) {
        const current = byType.get(connection.type.value) || 0;
        byType.set(connection.type.value, current + 1);
      }
    });

    return {
      total: curatorConnections.length,
      byType,
    };
  }
}
