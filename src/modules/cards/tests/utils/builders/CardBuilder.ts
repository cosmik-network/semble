import { Card } from '../../../domain/Card';
import { CardType, CardTypeEnum } from '../../../domain/value-objects/CardType';
import { CardContent } from '../../../domain/value-objects/CardContent';
import { CardId } from '../../../domain/value-objects/CardId';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { URL } from '../../../domain/value-objects/URL';
import { UrlMetadata } from '../../../domain/value-objects/UrlMetadata';
import { PublishedRecordId } from '../../../domain/value-objects/PublishedRecordId';
import { Selector } from '../../../domain/value-objects/selectors/Selector';
import { UniqueEntityID } from '../../../../../shared/domain/UniqueEntityID';

export class CardBuilder {
  private _id?: UniqueEntityID;
  private _curatorId: string = 'did:plc:defaultCurator';
  private _type: CardTypeEnum = CardTypeEnum.NOTE;
  private _content?: CardContent;
  private _url?: URL;
  private _parentCardId?: CardId;
  private _publishedRecordId?: PublishedRecordId;
  private _createdAt?: Date;
  private _updatedAt?: Date;

  withId(id: UniqueEntityID): CardBuilder {
    this._id = id;
    return this;
  }

  withCuratorId(curatorId: string): CardBuilder {
    this._curatorId = curatorId;
    return this;
  }

  withType(type: CardTypeEnum): CardBuilder {
    this._type = type;
    // Create default content based on type if not already set
    if (!this._content) {
      if (type === CardTypeEnum.URL) {
        const defaultUrl = URL.create('https://example.com').unwrap();
        this._url = defaultUrl;
        const contentResult = CardContent.createUrlContent(defaultUrl);
        if (contentResult.isOk()) {
          this._content = contentResult.value;
        }
      } else if (type === CardTypeEnum.NOTE) {
        const curatorIdResult = CuratorId.create(this._curatorId);
        if (curatorIdResult.isOk()) {
          const contentResult =
            CardContent.createNoteContent('Default note text');
          if (contentResult.isOk()) {
            this._content = contentResult.value;
          }
        }
      }
    }
    return this;
  }

  withUrl(url: URL): CardBuilder {
    this._url = url;
    return this;
  }

  withParentCard(parentCardId: CardId): CardBuilder {
    this._parentCardId = parentCardId;
    return this;
  }

  withPublishedRecordId(originalPublishedRecordId: {
    uri: string;
    cid: string;
  }): CardBuilder {
    this._publishedRecordId = PublishedRecordId.create(
      originalPublishedRecordId,
    );
    return this;
  }

  withCreatedAt(createdAt: Date): CardBuilder {
    this._createdAt = createdAt;
    return this;
  }

  withUpdatedAt(updatedAt: Date): CardBuilder {
    this._updatedAt = updatedAt;
    return this;
  }

  // Specific card type builders
  withUrlCard(url: URL, metadata?: UrlMetadata): CardBuilder {
    this._type = CardTypeEnum.URL;
    this._url = url; // URL cards require the URL property
    const contentResult = CardContent.createUrlContent(url, metadata);
    if (contentResult.isErr()) {
      throw new Error(
        `Failed to create URL content: ${contentResult.error.message}`,
      );
    }
    this._content = contentResult.value;
    return this;
  }

  withNoteCard(text: string): CardBuilder {
    this._type = CardTypeEnum.NOTE;
    const contentResult = CardContent.createNoteContent(text);
    if (contentResult.isErr()) {
      throw new Error(
        `Failed to create note content: ${contentResult.error.message}`,
      );
    }
    this._content = contentResult.value;
    return this;
  }

  withAnnotationCard(
    url: URL,
    selectors: Array<{
      exact: string;
      prefix?: string;
      suffix?: string;
    }>,
    note?: string,
  ): CardBuilder {
    this._type = CardTypeEnum.ANNOTATION;
    this._url = url; // Annotation cards require the URL property
    const selectorVos = selectors.map((props) => {
      const selectorResult = Selector.createTextQuote(props);
      if (selectorResult.isErr()) {
        throw new Error(
          `Failed to create selector: ${selectorResult.error.message}`,
        );
      }
      return selectorResult.value;
    });
    const contentResult = CardContent.createAnnotationContent(
      selectorVos,
      note,
    );
    if (contentResult.isErr()) {
      throw new Error(
        `Failed to create annotation content: ${contentResult.error.message}`,
      );
    }
    this._content = contentResult.value;
    return this;
  }

  build(): Card | Error {
    try {
      // Create default content if not set
      if (!this._content) {
        const curatorIdResult = CuratorId.create(this._curatorId);
        if (curatorIdResult.isErr()) {
          return new Error(
            `Invalid curator ID: ${curatorIdResult.error.message}`,
          );
        }

        if (this._type === CardTypeEnum.URL) {
          const defaultUrl =
            this._url || URL.create('https://example.com').unwrap();
          this._url = defaultUrl;
          const contentResult = CardContent.createUrlContent(defaultUrl);
          if (contentResult.isErr()) {
            return new Error(
              `Failed to create URL content: ${contentResult.error.message}`,
            );
          }
          this._content = contentResult.value;
        } else if (this._type === CardTypeEnum.NOTE) {
          const contentResult =
            CardContent.createNoteContent('Default note text');
          if (contentResult.isErr()) {
            return new Error(
              `Failed to create note content: ${contentResult.error.message}`,
            );
          }
          this._content = contentResult.value;
        } else {
          return new Error('Card content is required for this card type');
        }
      }

      const curatorIdResult = CuratorId.create(this._curatorId);
      if (curatorIdResult.isErr()) {
        return new Error(
          `Invalid curator ID: ${curatorIdResult.error.message}`,
        );
      }

      const cardTypeResult = CardType.create(this._type);
      if (cardTypeResult.isErr()) {
        return new Error(`Invalid card type: ${cardTypeResult.error.message}`);
      }

      const cardResult = Card.create(
        {
          curatorId: curatorIdResult.value,
          type: cardTypeResult.value,
          content: this._content,
          url: this._url,
          parentCardId: this._parentCardId,
          publishedRecordId: this._publishedRecordId,
          createdAt: this._createdAt,
          updatedAt: this._updatedAt,
        },
        this._id,
      );

      if (cardResult.isErr()) {
        return cardResult.error;
      }

      const card = cardResult.value;

      return card;
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  }

  buildOrThrow(): Card {
    const result = this.build();
    if (result instanceof Error) {
      throw result;
    }
    return result;
  }
}
