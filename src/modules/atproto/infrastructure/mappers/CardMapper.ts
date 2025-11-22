import { $Typed } from '@atproto/api';
import { Card } from 'src/modules/cards/domain/Card';
import { CardTypeEnum } from 'src/modules/cards/domain/value-objects/CardType';
import {
  Record,
  UrlContent,
  NoteContent,
  UrlMetadata,
} from '../lexicon/types/network/cosmik/card';
import { StrongRef } from '../../domain';
import { UrlMetadata as UrlMetadataVO } from 'src/modules/cards/domain/value-objects/UrlMetadata';
import { CuratorId } from 'src/modules/cards/domain/value-objects/CuratorId';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';
import { PublishedRecordId } from 'src/modules/cards/domain/value-objects/PublishedRecordId';

type CardRecordDTO = Record;

export class CardMapper {
  static cardCollection = new EnvironmentConfigService().getAtProtoCollections()
    .card;
  static toCreateRecordDTO(
    card: Card,
    curatorId: CuratorId,
    parentCardPublishedRecordId?: PublishedRecordId,
    viaCardPublishedRecordId?: PublishedRecordId,
  ): CardRecordDTO {
    const record: CardRecordDTO = {
      $type: this.cardCollection as any,
      type: card.type.value,
      content: this.mapCardContent(card),
      createdAt: card.createdAt.toISOString(),
    };

    // Only add top-level URL for non-URL cards (like NOTE cards that reference a URL)
    if (card.url && card.type.value !== CardTypeEnum.URL) {
      record.url = card.url.value;
    }

    if (card.publishedRecordId && !curatorId.equals(card.curatorId)) {
      const strongRef = new StrongRef(card.publishedRecordId.getValue());
      record.originalCard = {
        uri: strongRef.getValue().uri,
        cid: strongRef.getValue().cid,
      };
    }

    if (card.parentCardId && parentCardPublishedRecordId) {
      const strongRef = new StrongRef(parentCardPublishedRecordId.getValue());
      record.parentCard = {
        uri: strongRef.getValue().uri,
        cid: strongRef.getValue().cid,
      };
    }

    if (viaCardPublishedRecordId) {
      const strongRef = new StrongRef(viaCardPublishedRecordId.getValue());
      record.provenance = {
        $type: 'network.cosmik.defs#provenance' as any,
        via: {
          uri: strongRef.getValue().uri,
          cid: strongRef.getValue().cid,
        },
      };
    }

    return record;
  }

  private static mapCardContent(card: Card): $Typed<UrlContent | NoteContent> {
    switch (card.type.value) {
      case CardTypeEnum.URL: {
        const urlContent = card.content.urlContent!;
        const urlContentDTO: $Typed<UrlContent> = {
          $type: `${this.cardCollection}#urlContent` as any,
          url: urlContent.url.value,
        };

        if (urlContent.metadata) {
          urlContentDTO.metadata = this.mapUrlMetadata(urlContent.metadata);
        }

        return urlContentDTO;
      }

      case CardTypeEnum.NOTE: {
        const noteContent = card.content.noteContent!;
        const noteContentDTO: $Typed<NoteContent> = {
          $type: `${this.cardCollection}#noteContent` as any,
          text: noteContent.text,
        };

        return noteContentDTO;
      }

      default:
        throw new Error(`Unsupported card type: ${card.type.value}`);
    }
  }

  private static mapUrlMetadata(metadata: UrlMetadataVO): $Typed<UrlMetadata> {
    return {
      $type: `${this.cardCollection}#urlMetadata` as any,
      title: metadata.title,
      description: metadata.description,
      author: metadata.author,
      publishedDate: metadata.publishedDate?.toISOString(),
      siteName: metadata.siteName,
      imageUrl: metadata.imageUrl,
      type: metadata.type,
      retrievedAt: metadata.retrievedAt?.toISOString(),
    };
  }
}
