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
import { UrlMetadata } from '../../../domain/value-objects/UrlMetadata';
import { UrlType } from '../../../domain/value-objects/UrlType';
import { PublishedRecordDTO, PublishedRecordRefDTO } from './DTOTypes';
import { err, ok, Result } from '../../../../../shared/core/Result';

// Metadata JSON structure from database
interface UrlMetadataJSON {
  url: string;
  title?: string;
  description?: string;
  author?: string;
  publishedDate?: string;
  siteName?: string;
  imageUrl?: string;
  type?: string;
  retrievedAt?: string;
  doi?: string;
  isbn?: string;
}

// Database representation of a connection
export interface ConnectionDTO extends PublishedRecordRefDTO {
  id: string;
  curatorId: string;
  sourceType: string;
  sourceValue: string;
  sourceUrlMetadata?: UrlMetadataJSON;
  targetType: string;
  targetValue: string;
  targetUrlMetadata?: UrlMetadataJSON;
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

      // Parse source URL metadata if present
      let sourceUrlMetadata: UrlMetadata | undefined;
      if (dto.sourceUrlMetadata) {
        const metadataResult = UrlMetadata.create({
          url: dto.sourceUrlMetadata.url,
          title: dto.sourceUrlMetadata.title,
          description: dto.sourceUrlMetadata.description,
          author: dto.sourceUrlMetadata.author,
          siteName: dto.sourceUrlMetadata.siteName,
          imageUrl: dto.sourceUrlMetadata.imageUrl,
          type: dto.sourceUrlMetadata.type as UrlType,
          doi: dto.sourceUrlMetadata.doi,
          isbn: dto.sourceUrlMetadata.isbn,
        });
        if (metadataResult.isOk()) {
          sourceUrlMetadata = metadataResult.value;
        }
      }

      // Parse target URL metadata if present
      let targetUrlMetadata: UrlMetadata | undefined;
      if (dto.targetUrlMetadata) {
        const metadataResult = UrlMetadata.create({
          url: dto.targetUrlMetadata.url,
          title: dto.targetUrlMetadata.title,
          description: dto.targetUrlMetadata.description,
          author: dto.targetUrlMetadata.author,
          siteName: dto.targetUrlMetadata.siteName,
          imageUrl: dto.targetUrlMetadata.imageUrl,
          type: dto.targetUrlMetadata.type as UrlType,
          doi: dto.targetUrlMetadata.doi,
          isbn: dto.targetUrlMetadata.isbn,
        });
        if (metadataResult.isOk()) {
          targetUrlMetadata = metadataResult.value;
        }
      }

      // Reconstitute the connection from the database (doesn't raise events)
      const connectionOrError = Connection.reconstitute(
        {
          source: sourceOrError.value,
          target: targetOrError.value,
          sourceUrlMetadata,
          targetUrlMetadata,
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
      sourceUrlMetadata?: UrlMetadataJSON | null;
      targetType: string;
      targetValue: string;
      targetUrlMetadata?: UrlMetadataJSON | null;
      connectionType?: string | null;
      note?: string | null;
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

    // Serialize source URL metadata if present
    let sourceUrlMetadata: UrlMetadataJSON | undefined;
    if (connection.sourceUrlMetadata) {
      const metadata = connection.sourceUrlMetadata;
      sourceUrlMetadata = {
        url: metadata.url,
        title: metadata.title,
        description: metadata.description,
        author: metadata.author,
        siteName: metadata.siteName,
        imageUrl: metadata.imageUrl,
        type: metadata.type,
        doi: metadata.doi,
        isbn: metadata.isbn,
      };
    }

    // Serialize target URL metadata if present
    let targetUrlMetadata: UrlMetadataJSON | undefined;
    if (connection.targetUrlMetadata) {
      const metadata = connection.targetUrlMetadata;
      targetUrlMetadata = {
        url: metadata.url,
        title: metadata.title,
        description: metadata.description,
        author: metadata.author,
        siteName: metadata.siteName,
        imageUrl: metadata.imageUrl,
        type: metadata.type,
        doi: metadata.doi,
        isbn: metadata.isbn,
      };
    }

    return {
      connection: {
        id: connection.connectionId.getStringValue(),
        curatorId: connection.curatorId.value,
        sourceType: connection.source.type,
        sourceValue: connection.source.stringValue,
        sourceUrlMetadata: sourceUrlMetadata ?? null,
        targetType: connection.target.type,
        targetValue: connection.target.stringValue,
        targetUrlMetadata: targetUrlMetadata ?? null,
        connectionType: connection.type?.value ?? null,
        note: connection.note?.value ?? null,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
        publishedRecordId,
      },
      publishedRecord,
    };
  }
}
