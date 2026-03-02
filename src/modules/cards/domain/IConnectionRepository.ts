import { Result } from '../../../shared/core/Result';
import { Connection } from './Connection';
import { ConnectionId } from './value-objects/ConnectionId';
import { UrlOrCardId } from './value-objects/UrlOrCardId';
import { CuratorId } from './value-objects/CuratorId';

export interface IConnectionRepository {
  findById(id: ConnectionId): Promise<Result<Connection | null>>;
  findByIds(ids: ConnectionId[]): Promise<Result<Connection[]>>;
  findByCuratorId(curatorId: CuratorId): Promise<Result<Connection[]>>;
  findBySource(source: UrlOrCardId): Promise<Result<Connection[]>>;
  findByTarget(target: UrlOrCardId): Promise<Result<Connection[]>>;
  findBetween(
    source: UrlOrCardId,
    target: UrlOrCardId,
  ): Promise<Result<Connection[]>>;
  save(connection: Connection): Promise<Result<void>>;
  delete(connectionId: ConnectionId): Promise<Result<void>>;
}
