import { eq, inArray, and } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { IConnectionRepository } from '../../domain/IConnectionRepository';
import { Connection } from '../../domain/Connection';
import { ConnectionId } from '../../domain/value-objects/ConnectionId';
import { UrlOrCardId } from '../../domain/value-objects/UrlOrCardId';
import { CuratorId } from '../../domain/value-objects/CuratorId';
import { connections } from './schema/connection.sql';
import { publishedRecords } from './schema/publishedRecord.sql';
import { ConnectionDTO, ConnectionMapper } from './mappers/ConnectionMapper';
import { Result, ok, err } from '../../../../shared/core/Result';

export class DrizzleConnectionRepository implements IConnectionRepository {
  constructor(private db: PostgresJsDatabase) {}

  async findById(id: ConnectionId): Promise<Result<Connection | null>> {
    try {
      const connectionId = id.getStringValue();

      const connectionResult = await this.db
        .select({
          connection: connections,
          publishedRecord: publishedRecords,
        })
        .from(connections)
        .leftJoin(
          publishedRecords,
          eq(connections.publishedRecordId, publishedRecords.id),
        )
        .where(eq(connections.id, connectionId))
        .limit(1);

      if (connectionResult.length === 0) {
        return ok(null);
      }

      const result = connectionResult[0];
      if (!result || !result.connection) {
        return ok(null);
      }

      const connectionDTO: ConnectionDTO = {
        id: result.connection.id,
        curatorId: result.connection.curatorId,
        sourceType: result.connection.sourceType,
        sourceValue: result.connection.sourceValue,
        targetType: result.connection.targetType,
        targetValue: result.connection.targetValue,
        connectionType: result.connection.connectionType,
        note: result.connection.note || undefined,
        createdAt: result.connection.createdAt,
        updatedAt: result.connection.updatedAt,
        publishedRecordId: result.publishedRecord?.id || null,
        publishedRecord: result.publishedRecord || undefined,
      };

      const domainResult = ConnectionMapper.toDomain(connectionDTO);
      if (domainResult.isErr()) {
        return err(domainResult.error);
      }

      return ok(domainResult.value);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByIds(ids: ConnectionId[]): Promise<Result<Connection[]>> {
    try {
      if (ids.length === 0) {
        return ok([]);
      }

      const connectionIds = ids.map((id) => id.getStringValue());

      const connectionResults = await this.db
        .select({
          connection: connections,
          publishedRecord: publishedRecords,
        })
        .from(connections)
        .leftJoin(
          publishedRecords,
          eq(connections.publishedRecordId, publishedRecords.id),
        )
        .where(inArray(connections.id, connectionIds));

      const domainConnections: Connection[] = [];
      for (const result of connectionResults) {
        if (!result.connection) continue;

        const connectionDTO: ConnectionDTO = {
          id: result.connection.id,
          curatorId: result.connection.curatorId,
          sourceType: result.connection.sourceType,
          sourceValue: result.connection.sourceValue,
          targetType: result.connection.targetType,
          targetValue: result.connection.targetValue,
          connectionType: result.connection.connectionType,
          note: result.connection.note || undefined,
          createdAt: result.connection.createdAt,
          updatedAt: result.connection.updatedAt,
          publishedRecordId: result.publishedRecord?.id || null,
          publishedRecord: result.publishedRecord || undefined,
        };

        const domainResult = ConnectionMapper.toDomain(connectionDTO);
        if (domainResult.isErr()) {
          console.error(
            'Error mapping connection to domain:',
            domainResult.error,
          );
          continue;
        }
        domainConnections.push(domainResult.value);
      }

      return ok(domainConnections);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByCuratorId(curatorId: CuratorId): Promise<Result<Connection[]>> {
    try {
      const curatorIdString = curatorId.value;

      const connectionResults = await this.db
        .select({
          connection: connections,
          publishedRecord: publishedRecords,
        })
        .from(connections)
        .leftJoin(
          publishedRecords,
          eq(connections.publishedRecordId, publishedRecords.id),
        )
        .where(eq(connections.curatorId, curatorIdString))
        .orderBy(connections.createdAt);

      const domainConnections: Connection[] = [];
      for (const result of connectionResults) {
        if (!result.connection) continue;

        const connectionDTO: ConnectionDTO = {
          id: result.connection.id,
          curatorId: result.connection.curatorId,
          sourceType: result.connection.sourceType,
          sourceValue: result.connection.sourceValue,
          targetType: result.connection.targetType,
          targetValue: result.connection.targetValue,
          connectionType: result.connection.connectionType,
          note: result.connection.note || undefined,
          createdAt: result.connection.createdAt,
          updatedAt: result.connection.updatedAt,
          publishedRecordId: result.publishedRecord?.id || null,
          publishedRecord: result.publishedRecord || undefined,
        };

        const domainResult = ConnectionMapper.toDomain(connectionDTO);
        if (domainResult.isErr()) {
          console.error(
            'Error mapping connection to domain:',
            domainResult.error,
          );
          continue;
        }
        domainConnections.push(domainResult.value);
      }

      return ok(domainConnections);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findBySource(source: UrlOrCardId): Promise<Result<Connection[]>> {
    try {
      const connectionResults = await this.db
        .select({
          connection: connections,
          publishedRecord: publishedRecords,
        })
        .from(connections)
        .leftJoin(
          publishedRecords,
          eq(connections.publishedRecordId, publishedRecords.id),
        )
        .where(
          and(
            eq(connections.sourceType, source.type),
            eq(connections.sourceValue, source.stringValue),
          ),
        )
        .orderBy(connections.createdAt);

      const domainConnections: Connection[] = [];
      for (const result of connectionResults) {
        if (!result.connection) continue;

        const connectionDTO: ConnectionDTO = {
          id: result.connection.id,
          curatorId: result.connection.curatorId,
          sourceType: result.connection.sourceType,
          sourceValue: result.connection.sourceValue,
          targetType: result.connection.targetType,
          targetValue: result.connection.targetValue,
          connectionType: result.connection.connectionType,
          note: result.connection.note || undefined,
          createdAt: result.connection.createdAt,
          updatedAt: result.connection.updatedAt,
          publishedRecordId: result.publishedRecord?.id || null,
          publishedRecord: result.publishedRecord || undefined,
        };

        const domainResult = ConnectionMapper.toDomain(connectionDTO);
        if (domainResult.isErr()) {
          console.error(
            'Error mapping connection to domain:',
            domainResult.error,
          );
          continue;
        }
        domainConnections.push(domainResult.value);
      }

      return ok(domainConnections);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findByTarget(target: UrlOrCardId): Promise<Result<Connection[]>> {
    try {
      const connectionResults = await this.db
        .select({
          connection: connections,
          publishedRecord: publishedRecords,
        })
        .from(connections)
        .leftJoin(
          publishedRecords,
          eq(connections.publishedRecordId, publishedRecords.id),
        )
        .where(
          and(
            eq(connections.targetType, target.type),
            eq(connections.targetValue, target.stringValue),
          ),
        )
        .orderBy(connections.createdAt);

      const domainConnections: Connection[] = [];
      for (const result of connectionResults) {
        if (!result.connection) continue;

        const connectionDTO: ConnectionDTO = {
          id: result.connection.id,
          curatorId: result.connection.curatorId,
          sourceType: result.connection.sourceType,
          sourceValue: result.connection.sourceValue,
          targetType: result.connection.targetType,
          targetValue: result.connection.targetValue,
          connectionType: result.connection.connectionType,
          note: result.connection.note || undefined,
          createdAt: result.connection.createdAt,
          updatedAt: result.connection.updatedAt,
          publishedRecordId: result.publishedRecord?.id || null,
          publishedRecord: result.publishedRecord || undefined,
        };

        const domainResult = ConnectionMapper.toDomain(connectionDTO);
        if (domainResult.isErr()) {
          console.error(
            'Error mapping connection to domain:',
            domainResult.error,
          );
          continue;
        }
        domainConnections.push(domainResult.value);
      }

      return ok(domainConnections);
    } catch (error) {
      return err(error as Error);
    }
  }

  async findBetween(
    source: UrlOrCardId,
    target: UrlOrCardId,
  ): Promise<Result<Connection[]>> {
    try {
      const connectionResults = await this.db
        .select({
          connection: connections,
          publishedRecord: publishedRecords,
        })
        .from(connections)
        .leftJoin(
          publishedRecords,
          eq(connections.publishedRecordId, publishedRecords.id),
        )
        .where(
          and(
            eq(connections.sourceType, source.type),
            eq(connections.sourceValue, source.stringValue),
            eq(connections.targetType, target.type),
            eq(connections.targetValue, target.stringValue),
          ),
        )
        .orderBy(connections.createdAt);

      const domainConnections: Connection[] = [];
      for (const result of connectionResults) {
        if (!result.connection) continue;

        const connectionDTO: ConnectionDTO = {
          id: result.connection.id,
          curatorId: result.connection.curatorId,
          sourceType: result.connection.sourceType,
          sourceValue: result.connection.sourceValue,
          targetType: result.connection.targetType,
          targetValue: result.connection.targetValue,
          connectionType: result.connection.connectionType,
          note: result.connection.note || undefined,
          createdAt: result.connection.createdAt,
          updatedAt: result.connection.updatedAt,
          publishedRecordId: result.publishedRecord?.id || null,
          publishedRecord: result.publishedRecord || undefined,
        };

        const domainResult = ConnectionMapper.toDomain(connectionDTO);
        if (domainResult.isErr()) {
          console.error(
            'Error mapping connection to domain:',
            domainResult.error,
          );
          continue;
        }
        domainConnections.push(domainResult.value);
      }

      return ok(domainConnections);
    } catch (error) {
      return err(error as Error);
    }
  }

  async save(connection: Connection): Promise<Result<void>> {
    try {
      const { connection: connectionData, publishedRecord } =
        ConnectionMapper.toPersistence(connection);

      await this.db.transaction(async (tx) => {
        // Handle published record if it exists
        let publishedRecordId: string | undefined = undefined;

        if (publishedRecord) {
          const publishedRecordResult = await tx
            .insert(publishedRecords)
            .values({
              id: publishedRecord.id,
              uri: publishedRecord.uri,
              cid: publishedRecord.cid,
              recordedAt: publishedRecord.recordedAt || new Date(),
            })
            .onConflictDoNothing({
              target: [publishedRecords.uri, publishedRecords.cid],
            })
            .returning({ id: publishedRecords.id });

          if (publishedRecordResult.length === 0) {
            const existingRecord = await tx
              .select()
              .from(publishedRecords)
              .where(
                and(
                  eq(publishedRecords.uri, publishedRecord.uri),
                  eq(publishedRecords.cid, publishedRecord.cid),
                ),
              )
              .limit(1);

            if (existingRecord.length > 0) {
              publishedRecordId = existingRecord[0]!.id;
            }
          } else {
            publishedRecordId = publishedRecordResult[0]!.id;
          }
        }

        // Upsert the connection
        await tx
          .insert(connections)
          .values({
            ...connectionData,
            publishedRecordId: publishedRecordId,
          })
          .onConflictDoUpdate({
            target: connections.id,
            set: {
              curatorId: connectionData.curatorId,
              sourceType: connectionData.sourceType,
              sourceValue: connectionData.sourceValue,
              targetType: connectionData.targetType,
              targetValue: connectionData.targetValue,
              connectionType: connectionData.connectionType,
              note: connectionData.note,
              updatedAt: connectionData.updatedAt,
              publishedRecordId: publishedRecordId,
            },
          });
      });

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async delete(connectionId: ConnectionId): Promise<Result<void>> {
    try {
      const id = connectionId.getStringValue();

      await this.db.delete(connections).where(eq(connections.id, id));

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }
}
