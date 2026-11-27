import {
  IConnectionQueryRepository,
  ConnectionQueryOptions,
  PaginatedConnectionQueryResult,
  ConnectionForUserRawDTO,
  ConnectionForAnnotationRawDTO,
  ConnectionSortField,
  SortOrder,
  ConnectionAnchorType,
} from '../../domain/IConnectionQueryRepository';
import { InMemoryConnectionRepository } from './InMemoryConnectionRepository';
import { InMemoryCardRepository } from './InMemoryCardRepository';
import { UrlOrCardIdType } from '../../domain/value-objects/UrlOrCardId';
import { ConnectionTypeEnum } from '../../domain/value-objects/ConnectionType';

export class InMemoryConnectionQueryRepository implements IConnectionQueryRepository {
  constructor(
    private connectionRepository: InMemoryConnectionRepository,
    // Needed to resolve CARD endpoints to their annotation cards' URLs
    private cardRepository?: InMemoryCardRepository,
  ) {}

  async getConnectionsForUrl(
    url: string,
    direction: 'forward' | 'backward' | 'both',
    options: ConnectionQueryOptions,
    anchorType?: ConnectionAnchorType,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUserRawDTO>> {
    const { page, limit, sortBy, sortOrder, connectionTypes } = options;

    // Get all connections from the repository
    const allConnections = this.connectionRepository.getAllConnections();

    // A connection matches when the counted endpoint is the URL itself or an
    // ANNOTATION card anchored on that URL; anchorType restricts to one kind
    const annotationCardIds = new Set(
      (this.cardRepository?.getAllCards() ?? [])
        .filter((card) => card.isAnnotationCard && card.url?.value === url)
        .map((card) => card.cardId.getStringValue()),
    );

    const endpointMatchesUrl = (endpoint: {
      type: UrlOrCardIdType;
      stringValue: string;
    }): boolean =>
      anchorType !== 'ANNOTATION' &&
      endpoint.type === UrlOrCardIdType.URL &&
      endpoint.stringValue === url;
    const endpointMatchesAnnotation = (endpoint: {
      type: UrlOrCardIdType;
      stringValue: string;
    }): boolean =>
      anchorType !== 'URL' &&
      endpoint.type === UrlOrCardIdType.CARD &&
      annotationCardIds.has(endpoint.stringValue);
    const endpointMatches = (endpoint: {
      type: UrlOrCardIdType;
      stringValue: string;
    }): boolean =>
      endpointMatchesUrl(endpoint) || endpointMatchesAnnotation(endpoint);

    // Filter connections based on direction
    let filteredConnections = allConnections.filter((connection) => {
      const isSourceMatch = endpointMatches(connection.source);
      const isTargetMatch = endpointMatches(connection.target);

      if (direction === 'forward') {
        return isSourceMatch;
      } else if (direction === 'backward') {
        return isTargetMatch;
      } else {
        // both
        return isSourceMatch || isTargetMatch;
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

    // Map to DTOs with typed endpoints
    const items: ConnectionForUserRawDTO[] = paginatedConnections.map(
      (connection) => ({
        connection: {
          id: connection.connectionId.getStringValue(),
          type: connection.type?.value,
          note: connection.note?.value,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt,
          curatorId: connection.curatorId.value,
        },
        source: {
          type: connection.source.type === UrlOrCardIdType.URL ? 'URL' : 'CARD',
          value: connection.source.stringValue,
        },
        target: {
          type: connection.target.type === UrlOrCardIdType.URL ? 'URL' : 'CARD',
          value: connection.target.stringValue,
        },
      }),
    );

    return {
      items,
      totalCount: filteredConnections.length,
      hasMore:
        offset + paginatedConnections.length < filteredConnections.length,
    };
  }

  async getConnectionsForCards(
    cardIds: string[],
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForAnnotationRawDTO>> {
    const { page, limit, sortBy, sortOrder, connectionTypes } = options;
    const cardIdSet = new Set(cardIds);

    const allConnections = this.connectionRepository.getAllConnections();

    // Connections where any of the given cards is an endpoint (source or target)
    let filteredConnections = allConnections.filter((connection) => {
      const isSourceMatch =
        connection.source.type === UrlOrCardIdType.CARD &&
        cardIdSet.has(connection.source.cardId?.getStringValue() ?? '');
      const isTargetMatch =
        connection.target.type === UrlOrCardIdType.CARD &&
        cardIdSet.has(connection.target.cardId?.getStringValue() ?? '');
      return isSourceMatch || isTargetMatch;
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

    // Map to DTOs carrying endpoint types
    const items: ConnectionForAnnotationRawDTO[] = paginatedConnections.map(
      (connection) => ({
        connection: {
          id: connection.connectionId.getStringValue(),
          type: connection.type?.value,
          note: connection.note?.value,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt,
          curatorId: connection.curatorId.value,
        },
        source: {
          type: connection.source.type === UrlOrCardIdType.URL ? 'URL' : 'CARD',
          value: connection.source.stringValue,
        },
        target: {
          type: connection.target.type === UrlOrCardIdType.URL ? 'URL' : 'CARD',
          value: connection.target.stringValue,
        },
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
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUserRawDTO>> {
    const { page, limit, sortBy, sortOrder, connectionTypes } = options;

    // Get all connections from the repository
    const allConnections = this.connectionRepository.getAllConnections();

    // Filter connections by curator — any endpoint type (URL or CARD)
    let filteredConnections = allConnections.filter((connection) => {
      return connection.curatorId.value === curatorId;
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

    // Map to DTOs with typed endpoints
    const items: ConnectionForUserRawDTO[] = paginatedConnections.map(
      (connection) => ({
        connection: {
          id: connection.connectionId.getStringValue(),
          type: connection.type?.value,
          note: connection.note?.value,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt,
          curatorId: connection.curatorId.value,
        },
        source: {
          type: connection.source.type === UrlOrCardIdType.URL ? 'URL' : 'CARD',
          value: connection.source.stringValue,
        },
        target: {
          type: connection.target.type === UrlOrCardIdType.URL ? 'URL' : 'CARD',
          value: connection.target.stringValue,
        },
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

    // All connections created by this curator — any endpoint type
    const curatorConnections = allConnections.filter(
      (connection) => connection.curatorId.value === curatorId,
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

  async hasConnectionForCards(
    curatorId: string,
    cardIds: string[],
  ): Promise<boolean> {
    if (cardIds.length === 0) {
      return false;
    }

    const cardIdSet = new Set(cardIds);
    const allConnections = this.connectionRepository.getAllConnections();
    return allConnections.some(
      (connection) =>
        connection.curatorId.value === curatorId &&
        ((connection.source.type === UrlOrCardIdType.CARD &&
          cardIdSet.has(connection.source.cardId?.getStringValue() ?? '')) ||
          (connection.target.type === UrlOrCardIdType.CARD &&
            cardIdSet.has(connection.target.cardId?.getStringValue() ?? ''))),
    );
  }
}
