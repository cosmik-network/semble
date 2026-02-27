import { UniqueEntityID } from '../../../../../shared/domain/UniqueEntityID';
import { Connection } from '../../../domain/Connection';
import { ConnectionId } from '../../../domain/value-objects/ConnectionId';
import { ConnectionType } from '../../../domain/value-objects/ConnectionType';
import {
  UrlOrCardId,
  UrlOrCardIdType,
} from '../../../domain/value-objects/UrlOrCardId';
import { ConnectionNote } from '../../../domain/value-objects/ConnectionNote';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { PublishedRecordId } from '../../../domain/value-objects/PublishedRecordId';
import { PublishedRecordDTO, PublishedRecordRefDTO } from './DTOTypes';
import { err, ok, Result } from '../../../../../shared/core/Result';

// Database representation of a connection
export interface ConnectionDTO extends PublishedRecordRefDTO {
  id: string;
  curatorId: string;
  sourceType: string;
  sourceValue: string;
  targetType: string;
  targetValue: string;
  connectionType?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ConnectionMapper {
  public static toDomain(dto: ConnectionDTO): Result<Connection> {
    try {
      // Create curator ID
      const curatorIdOrError = CuratorId.create(dto.curatorId);
      if (curatorIdOrError.isErr()) return err(curatorIdOrError.error);

      // Create source
      const sourceOrError = UrlOrCardId.reconstruct(
        dto.sourceType as UrlOrCardIdType,
        dto.sourceValue,
      );
      if (sourceOrError.isErr()) return err(sourceOrError.error);

      // Create target
      const targetOrError = UrlOrCardId.reconstruct(
        dto.targetType as UrlOrCardIdType,
        dto.targetValue,
      );
      if (targetOrError.isErr()) return err(targetOrError.error);

      // Create optional connection type
      let type: ConnectionType | undefined;
      if (dto.connectionType) {
        const typeOrError = ConnectionType.createFromString(dto.connectionType);
        if (typeOrError.isErr()) return err(typeOrError.error);
        type = typeOrError.value;
      }

      // Create optional note
      let note: ConnectionNote | undefined;
      if (dto.note) {
        const noteOrError = ConnectionNote.create(dto.note);
        if (noteOrError.isErr()) return err(noteOrError.error);
        note = noteOrError.value;
      }

      // Create optional published record ID
      let publishedRecordId: PublishedRecordId | undefined;
      if (dto.publishedRecord) {
        publishedRecordId = PublishedRecordId.create({
          uri: dto.publishedRecord.uri,
          cid: dto.publishedRecord.cid,
        });
      }

      // Create the connection
      const connectionOrError = Connection.create(
        {
          source: sourceOrError.value,
          target: targetOrError.value,
          type,
          note,
          curatorId: curatorIdOrError.value,
          publishedRecordId,
          createdAt: dto.createdAt,
          updatedAt: dto.updatedAt,
        },
        new UniqueEntityID(dto.id),
      );

      if (connectionOrError.isErr()) return err(connectionOrError.error);

      return ok(connectionOrError.value);
    } catch (error) {
      return err(error as Error);
    }
  }

  public static toPersistence(connection: Connection): {
    connection: {
      id: string;
      curatorId: string;
      sourceType: string;
      sourceValue: string;
      targetType: string;
      targetValue: string;
      connectionType?: string;
      note?: string;
      createdAt: Date;
      updatedAt: Date;
      publishedRecordId?: string;
    };
    publishedRecord?: PublishedRecordDTO;
  } {
    // Create published record data if it exists
    let publishedRecord: PublishedRecordDTO | undefined;
    let publishedRecordId: string | undefined;

    if (connection.publishedRecordId) {
      const recordId = new UniqueEntityID().toString();
      publishedRecord = {
        id: recordId,
        uri: connection.publishedRecordId.uri,
        cid: connection.publishedRecordId.cid,
        recordedAt: new Date(),
      };
      publishedRecordId = recordId;
    }

    return {
      connection: {
        id: connection.connectionId.getStringValue(),
        curatorId: connection.curatorId.value,
        sourceType: connection.source.type,
        sourceValue: connection.source.stringValue,
        targetType: connection.target.type,
        targetValue: connection.target.stringValue,
        connectionType: connection.type?.value,
        note: connection.note?.value,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
        publishedRecordId,
      },
      publishedRecord,
    };
  }
}
