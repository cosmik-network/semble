import { Connection } from 'src/modules/cards/domain/Connection';
import { Record } from '../lexicon/types/network/cosmik/connection';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';

type ConnectionRecordDTO = Record;

export class ConnectionMapper {
  static readonly connectionType =
    new EnvironmentConfigService().getAtProtoCollections().connection;

  /**
   * CARD endpoints publish as the referenced card's AT URI (its published
   * record), the same conversion from card id to AT URI that collection
   * links do — the bare local card id is meaningless outside this database.
   * cardRecordUris carries the resolved URIs; values fall back to the local
   * stringValue when a card has no published record.
   */
  static toCreateRecordDTO(
    connection: Connection,
    cardRecordUris?: { source?: string; target?: string },
  ): ConnectionRecordDTO {
    return {
      $type: this.connectionType as any,
      source: cardRecordUris?.source ?? connection.source.stringValue,
      target: cardRecordUris?.target ?? connection.target.stringValue,
      connectionType: connection.type?.value,
      note: connection.note?.value,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
    };
  }
}
