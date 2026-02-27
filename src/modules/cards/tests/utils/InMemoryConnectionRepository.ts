import { Result, ok, err } from '../../../../shared/core/Result';
import { IConnectionRepository } from '../../domain/IConnectionRepository';
import { Connection } from '../../domain/Connection';
import { ConnectionId } from '../../domain/value-objects/ConnectionId';
import { UrlOrCardId } from '../../domain/value-objects/UrlOrCardId';
import { CuratorId } from '../../domain/value-objects/CuratorId';

export class InMemoryConnectionRepository implements IConnectionRepository {
  private static instance: InMemoryConnectionRepository;
  private connections: Map<string, Connection> = new Map();

  private constructor() {}

  public static getInstance(): InMemoryConnectionRepository {
    if (!InMemoryConnectionRepository.instance) {
      InMemoryConnectionRepository.instance =
        new InMemoryConnectionRepository();
    }
    return InMemoryConnectionRepository.instance;
  }

  private clone(connection: Connection): Connection {
    const connectionResult = Connection.create(
      {
        curatorId: connection.curatorId,
        source: connection.source,
        target: connection.target,
        type: connection.type,
        note: connection.note,
        publishedRecordId: connection.publishedRecordId,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      },
      connection.id,
    );

    if (connectionResult.isErr()) {
      throw new Error(
        `Failed to clone connection: ${connectionResult.error.message}`,
      );
    }

    return connectionResult.value;
  }

  async findById(id: ConnectionId): Promise<Result<Connection | null>> {
    try {
      const connection = this.connections.get(id.getStringValue());
      return ok(connection ? this.clone(connection) : null);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByIds(ids: ConnectionId[]): Promise<Result<Connection[]>> {
    try {
      const connections: Connection[] = [];
      for (const id of ids) {
        const connection = this.connections.get(id.getStringValue());
        if (connection) {
          connections.push(this.clone(connection));
        }
      }
      return ok(connections);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByCuratorId(curatorId: CuratorId): Promise<Result<Connection[]>> {
    try {
      const connections = Array.from(this.connections.values()).filter(
        (connection) => connection.curatorId.value === curatorId.value,
      );
      return ok(connections.map((connection) => this.clone(connection)));
    } catch (error) {
      return err(error as Error);
    }
  }

  async findBySource(source: UrlOrCardId): Promise<Result<Connection[]>> {
    try {
      const connections = Array.from(this.connections.values()).filter(
        (connection) =>
          connection.source.type === source.type &&
          connection.source.stringValue === source.stringValue,
      );
      return ok(connections.map((connection) => this.clone(connection)));
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByTarget(target: UrlOrCardId): Promise<Result<Connection[]>> {
    try {
      const connections = Array.from(this.connections.values()).filter(
        (connection) =>
          connection.target.type === target.type &&
          connection.target.stringValue === target.stringValue,
      );
      return ok(connections.map((connection) => this.clone(connection)));
    } catch (error) {
      return err(error as Error);
    }
  }

  async findBetween(
    source: UrlOrCardId,
    target: UrlOrCardId,
  ): Promise<Result<Connection[]>> {
    try {
      const connections = Array.from(this.connections.values()).filter(
        (connection) =>
          connection.source.type === source.type &&
          connection.source.stringValue === source.stringValue &&
          connection.target.type === target.type &&
          connection.target.stringValue === target.stringValue,
      );
      return ok(connections.map((connection) => this.clone(connection)));
    } catch (error) {
      return err(error as Error);
    }
  }

  async save(connection: Connection): Promise<Result<void>> {
    try {
      this.connections.set(
        connection.connectionId.getStringValue(),
        this.clone(connection),
      );
      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async delete(connectionId: ConnectionId): Promise<Result<void>> {
    try {
      this.connections.delete(connectionId.getStringValue());
      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  // Helper methods for testing
  public clear(): void {
    this.connections.clear();
  }

  public getStoredConnection(id: ConnectionId): Connection | undefined {
    return this.connections.get(id.getStringValue());
  }

  public getAllConnections(): Connection[] {
    return Array.from(this.connections.values()).map((connection) =>
      this.clone(connection),
    );
  }
}
