import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  IConnectionQueryRepository,
  ConnectionQueryOptions,
  PaginatedConnectionQueryResult,
  ConnectionForUrlDTO,
  ConnectionForUserDTO,
} from '../../domain/IConnectionQueryRepository';
import { ConnectionQueryService } from './query-services/ConnectionQueryService';
import { ConnectionTypeEnum } from '../../domain/value-objects/ConnectionType';

export class DrizzleConnectionQueryRepository
  implements IConnectionQueryRepository
{
  private connectionQueryService: ConnectionQueryService;

  constructor(private db: PostgresJsDatabase) {
    this.connectionQueryService = new ConnectionQueryService(db);
  }

  async getForwardConnectionsForUrl(
    url: string,
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUrlDTO>> {
    return this.connectionQueryService.getForwardConnectionsForUrl(
      url,
      options,
    );
  }

  async getBackwardConnectionsForUrl(
    url: string,
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUrlDTO>> {
    return this.connectionQueryService.getBackwardConnectionsForUrl(
      url,
      options,
    );
  }

  async getConnectionsForUser(
    curatorId: string,
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUserDTO>> {
    return this.connectionQueryService.getConnectionsForUser(
      curatorId,
      options,
    );
  }

  async getConnectionStatsForUrl(url: string): Promise<{
    forwardTotal: number;
    backwardTotal: number;
    forwardByType: Map<ConnectionTypeEnum, number>;
    backwardByType: Map<ConnectionTypeEnum, number>;
  }> {
    return this.connectionQueryService.getConnectionStatsForUrl(url);
  }
}
