import { Connection } from 'src/modules/cards/domain/Connection';
import { Record } from '../lexicon/types/network/cosmik/connection';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';

type ConnectionRecordDTO = Record;

export class ConnectionMapper {
  static readonly connectionType =
    new EnvironmentConfigService().getAtProtoCollections().connection;

  static toCreateRecordDTO(connection: Connection): ConnectionRecordDTO {
    return {
      $type: this.connectionType as any,
      source: connection.source.stringValue,
      target: connection.target.stringValue,
      connectionType: connection.type?.value,
      note: connection.note?.value,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
    };
  }
}
