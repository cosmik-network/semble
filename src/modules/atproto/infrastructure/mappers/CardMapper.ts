import { $Typed } from '@atproto/api';
import { createHash } from 'crypto';
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
import { toUrlMetadataJSON } from 'src/modules/cards/domain/value-objects/urlMetadataMapping';
import { CuratorId } from 'src/modules/cards/domain/value-objects/CuratorId';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';
import { PublishedRecordId } from 'src/modules/cards/domain/value-objects/PublishedRecordId';

type CardRecordDTO = Record;

// at.margin.note record shape (prod lexicon; local/dev publish the same shape
// under environment-suffixed cosmik NSIDs, see EnvironmentConfigService).
// Declared locally like ProcessMarginNoteFirehoseEventUseCase does — the
// generated type file for this lexicon doesn't currently compile.
export interface MarginNoteRecordDTO {
  $type: string;
  motivation: string;
  createdAt: string;
  target: {
    source: string;
    sourceHash: string;
    selector?: {
      type: string;
      exact?: string;
      prefix?: string;
      suffix?: string;
    };
  };
  body?: {
    value: string;
    format: string;
  };
  [k: string]: unknown;
}

export class CardMapper {
  private static configService = new EnvironmentConfigService();
  static cardCollection = CardMapper.configService.getAtProtoCollections().card;
  static baseCollection = CardMapper.configService.getAtProtoBaseCollection();
  static annotationCollection =
    CardMapper.configService.getAtProtoCollections().annotation;
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
        $type: `${this.baseCollection}.defs#provenance` as any,
        via: {
          uri: strongRef.getValue().uri,
          cid: strongRef.getValue().cid,
        },
      };
    }

    return record;
  }

  /**
   * Builds an at.margin.note record from an annotation card. The lexicon's
   * target.selector is a single selector (with refinedBy for refinement), so
   * parallel domain selectors collapse to the primary text-quote selector.
   * Motivation follows W3C semantics: commenting when there is a body note,
   * highlighting otherwise.
   */
  static toMarginNoteRecordDTO(card: Card): MarginNoteRecordDTO {
    if (!card.isAnnotationCard) {
      throw new Error(
        `toMarginNoteRecordDTO requires an annotation card, got ${card.type.value}`,
      );
    }
    if (!card.url) {
      throw new Error('Annotation card is missing its source url');
    }

    const annotationContent = card.content.annotationContent!;
    const textQuote = annotationContent.textQuoteSelector;

    return {
      $type: this.annotationCollection,
      motivation: annotationContent.note ? 'commenting' : 'highlighting',
      createdAt: card.createdAt.toISOString(),
      target: {
        source: card.url.value,
        // SHA256 hash of the url for indexing, per the lexicon target def.
        // Normalization is just trimming — the value only needs to be a
        // stable function of the url since domain urls are already trimmed.
        sourceHash: createHash('sha256')
          .update(card.url.value.trim())
          .digest('hex'),
        selector: textQuote
          ? {
              type: 'TextQuoteSelector',
              exact: textQuote.exact,
              prefix: textQuote.prefix,
              suffix: textQuote.suffix,
            }
          : undefined,
      },
      body: annotationContent.note
        ? { value: annotationContent.note, format: 'text/plain' }
        : undefined,
    };
  }

  private static mapCardContent(card: Card): $Typed<UrlContent | NoteContent> {
    switch (card.type.value) {
      case CardTypeEnum.URL: {
        const urlContent = card.content.urlContent!;
        const urlContentDTO: $Typed<UrlContent> = {
          $type: `${this.baseCollection}.card#urlContent` as any,
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
          $type: `${this.baseCollection}.card#noteContent` as any,
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
      $type: `${this.baseCollection}.card#urlMetadata` as any,
      title: metadata.title,
      description: metadata.description,
      author: metadata.author,
      // Lexicon requires format: 'datetime' (RFC-3339), so serialize the Date.
      // toIso guards against Invalid Date, which would throw in toISOString().
      publishedDate: toUrlMetadataJSON(metadata).publishedDate,
      siteName: metadata.siteName,
      imageUrl: metadata.imageUrl,
      type: metadata.type,
      doi: metadata.doi,
      isbn: metadata.isbn,
    };
  }
}
