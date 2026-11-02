import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  IConnectionQueryRepository,
  ConnectionQueryOptions,
  PaginatedConnectionQueryResult,
  ConnectionForUserDTO,
} from '../../domain/IConnectionQueryRepository';
import { ConnectionQueryService } from './query-services/ConnectionQueryService';
import { ConnectionTypeEnum } from '../../domain/value-objects/ConnectionType';

export class DrizzleConnectionQueryRepository implements IConnectionQueryRepository {
  private connectionQueryService: ConnectionQueryService;

  constructor(private db: PostgresJsDatabase) {
    this.connectionQueryService = new ConnectionQueryService(db);
  }

  async getConnectionsForUrl(
    url: string,
    direction: 'forward' | 'backward' | 'both',
    options: ConnectionQueryOptions,
  ): Promise<PaginatedConnectionQueryResult<ConnectionForUserDTO>> {
    return this.connectionQueryService.getConnectionsForUrlWithDirection(
      url,
      direction,
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

  async getConnectionStatsForCurator(curatorId: string): Promise<{
    total: number;
    byType: Map<ConnectionTypeEnum, number>;
  }> {
    return this.connectionQueryService.getConnectionStatsForCurator(curatorId);
  }
}
