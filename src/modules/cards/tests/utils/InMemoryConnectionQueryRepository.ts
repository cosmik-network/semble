import {
  IConnectionQueryRepository,
  ConnectionQueryOptions,
  PaginatedConnectionQueryResult,
  ConnectionForUrlDTO,
  ConnectionSortField,
  SortOrder,
} from '../../domain/IConnectionQueryRepository';
import { InMemoryConnectionRepository } from './InMemoryConnectionRepository';
import { UrlOrCardIdType } from '../../domain/value-objects/UrlOrCardId';

export class InMemoryConnectionQueryRepository
  implements IConnectionQueryRepository
{
  constructor(private connectionRepository: InMemoryConnectionRepository) {}

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

    // Get all connections from the repository
    const allConnections = this.connectionRepository.getAllConnections();

    // Filter connections based on direction and URL type
    let filteredConnections = allConnections.filter((connection) => {
      if (direction === 'source') {
        // Forward: source must be URL matching the input, target must also be URL
        return (
          connection.source.type === UrlOrCardIdType.URL &&
          connection.source.stringValue === url &&
          connection.target.type === UrlOrCardIdType.URL
        );
      } else {
        // Backward: target must be URL matching the input, source must also be URL
        return (
          connection.target.type === UrlOrCardIdType.URL &&
          connection.target.stringValue === url &&
          connection.source.type === UrlOrCardIdType.URL
        );
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

    // Map to DTOs
    const items: ConnectionForUrlDTO[] = paginatedConnections.map(
      (connection) => ({
        connection: {
          id: connection.connectionId.getStringValue(),
          type: connection.type?.value,
          note: connection.note?.value,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt,
          curatorId: connection.curatorId.value,
        },
        // Return the URL from the opposite direction
        url:
          direction === 'source'
            ? connection.target.stringValue
            : connection.source.stringValue,
      }),
    );

    return {
      items,
      totalCount: filteredConnections.length,
      hasMore:
        offset + paginatedConnections.length < filteredConnections.length,
    };
  }
}
