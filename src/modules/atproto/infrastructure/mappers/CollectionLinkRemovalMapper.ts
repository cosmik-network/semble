import { PublishedRecordIdProps } from 'src/modules/cards/domain/value-objects/PublishedRecordId';
import { CuratorId } from 'src/modules/cards/domain/value-objects/CuratorId';
import { Record } from '../lexicon/types/network/cosmik/collectionLinkRemoval';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';

type CollectionLinkRemovalRecordDTO = Record;

export class CollectionLinkRemovalMapper {
  private static configService = new EnvironmentConfigService();
  static collectionLinkRemovalType =
    CollectionLinkRemovalMapper.configService.getAtProtoCollections()
      .collectionLinkRemoval;

  static toCreateRecordDTO(
    collectionPublishedRecordId: PublishedRecordIdProps,
    removedLinkPublishedRecordId: PublishedRecordIdProps,
    removedBy: CuratorId,
    reason?: string,
  ): CollectionLinkRemovalRecordDTO {
    const record: CollectionLinkRemovalRecordDTO = {
      $type: this.collectionLinkRemovalType as any,
      collection: {
        uri: collectionPublishedRecordId.uri,
        cid: collectionPublishedRecordId.cid,
      },
      removedLink: {
        uri: removedLinkPublishedRecordId.uri,
        cid: removedLinkPublishedRecordId.cid,
      },
      removedBy: removedBy.value,
      removedAt: new Date().toISOString(),
    };

    if (reason) {
      record.reason = reason;
    }

    return record;
  }
}
