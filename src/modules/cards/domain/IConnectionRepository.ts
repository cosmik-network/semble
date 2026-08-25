import { Result } from '../../../shared/core/Result';
import { Connection } from './Connection';
import { ConnectionId } from './value-objects/ConnectionId';
import { UrlOrCardId } from './value-objects/UrlOrCardId';
import { CuratorId } from './value-objects/CuratorId';
import { ConnectionType } from './value-objects/ConnectionType';
import { ConnectionNote } from './value-objects/ConnectionNote';

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
  /**
   * Find a curator's existing connection that is identical in every respect:
   * same source -> target direction, same connection type, same note.
   *
   * Every field is part of the identity because each carries meaning:
   * "A supports B" and "B supports A" are different claims, as are
   * "A supports B" and "A opposes B", as are the same claim annotated with
   * two different notes. Only a byte-for-byte identical assertion is a
   * duplicate.
   *
   * `note` is undefined when the connection carries no note; that matches
   * only other connections which also have no note.
   */
  findByCuratorIdenticalConnection(
    curatorId: CuratorId,
    source: UrlOrCardId,
    target: UrlOrCardId,
    type: ConnectionType,
    note: ConnectionNote | undefined,
  ): Promise<Result<Connection | null>>;
  save(connection: Connection): Promise<Result<void>>;
  delete(connectionId: ConnectionId): Promise<Result<void>>;
}
