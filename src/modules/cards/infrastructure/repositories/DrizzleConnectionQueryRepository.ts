import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  IConnectionQueryRepository,
  ConnectionQueryOptions,
  PaginatedConnectionQueryResult,
  ConnectionForUrlDTO,
  ConnectionForUserDTO,
} from '../../domain/IConnectionQueryRepository';
import { ConnectionQueryService } from './query-services/ConnectionQueryService';

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
}
