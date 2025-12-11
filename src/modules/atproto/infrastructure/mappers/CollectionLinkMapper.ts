import { CardLink } from 'src/modules/cards/domain/Collection';
import { PublishedRecordIdProps } from 'src/modules/cards/domain/value-objects/PublishedRecordId';
import { Record } from '../lexicon/types/network/cosmik/collectionLink';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';

type CollectionLinkRecordDTO = Record;

export class CollectionLinkMapper {
  private static configService = new EnvironmentConfigService();
  static collectionLinkType =
    CollectionLinkMapper.configService.getAtProtoCollections().collectionLink;
  static baseCollection =
    CollectionLinkMapper.configService.getAtProtoBaseCollection();

  static toCreateRecordDTO(
    cardLink: CardLink,
    collectionPublishedRecordId: PublishedRecordIdProps,
    cardPublishedRecordId: PublishedRecordIdProps,
    originalCardPublishedRecordId?: PublishedRecordIdProps,
    viaCardPublishedRecordId?: PublishedRecordIdProps,
  ): CollectionLinkRecordDTO {
    const record: CollectionLinkRecordDTO = {
      $type: this.collectionLinkType as any,
      collection: {
        uri: collectionPublishedRecordId.uri,
        cid: collectionPublishedRecordId.cid,
      },
      card: {
        uri: cardPublishedRecordId.uri,
        cid: cardPublishedRecordId.cid,
      },
      addedBy: cardLink.addedBy.value,
      addedAt: cardLink.addedAt.toISOString(),
      createdAt: new Date().toISOString(),
    };

    if (originalCardPublishedRecordId) {
      record.originalCard = {
        uri: originalCardPublishedRecordId.uri,
        cid: originalCardPublishedRecordId.cid,
      };
    }

    if (viaCardPublishedRecordId) {
      record.provenance = {
        $type: `${this.baseCollection}.defs#provenance` as any,
        via: {
          uri: viaCardPublishedRecordId.uri,
          cid: viaCardPublishedRecordId.cid,
        },
      };
    }

    return record;
  }
}
