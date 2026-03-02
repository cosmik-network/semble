import { ok, Result, err } from '../../../../shared/core/Result';
import { ValueObject } from '../../../../shared/domain/ValueObject';
import { URL } from './URL';
import { CardId } from './CardId';

export enum UrlOrCardIdType {
  URL = 'URL',
  CARD = 'CARD',
}

// Discriminated union type
type UrlOrCardIdValue =
  | { type: UrlOrCardIdType.URL; url: URL }
  | { type: UrlOrCardIdType.CARD; cardId: CardId };

interface UrlOrCardIdProps {
  value: UrlOrCardIdValue;
}

export class UrlOrCardId extends ValueObject<UrlOrCardIdProps> {
  get type(): UrlOrCardIdType {
    return this.props.value.type;
  }

  get isUrl(): boolean {
    return this.props.value.type === UrlOrCardIdType.URL;
  }

  get isCard(): boolean {
    return this.props.value.type === UrlOrCardIdType.CARD;
  }

  get url(): URL | null {
    if (this.props.value.type === UrlOrCardIdType.URL) {
      return this.props.value.url;
    }
    return null;
  }

  get cardId(): CardId | null {
    if (this.props.value.type === UrlOrCardIdType.CARD) {
      return this.props.value.cardId;
    }
    return null;
  }

  // Get the string representation for persistence
  get stringValue(): string {
    if (this.props.value.type === UrlOrCardIdType.URL) {
      return this.props.value.url.value;
    } else {
      return this.props.value.cardId.getStringValue();
    }
  }

  private constructor(props: UrlOrCardIdProps) {
    super(props);
  }

  public static createFromUrl(url: URL): Result<UrlOrCardId> {
    return ok(
      new UrlOrCardId({
        value: { type: UrlOrCardIdType.URL, url },
      }),
    );
  }

  public static createFromCard(cardId: CardId): Result<UrlOrCardId> {
    return ok(
      new UrlOrCardId({
        value: { type: UrlOrCardIdType.CARD, cardId },
      }),
    );
  }

  // Factory method for reconstruction from persistence
  public static reconstruct(
    type: UrlOrCardIdType,
    value: string,
  ): Result<UrlOrCardId, Error> {
    if (type === UrlOrCardIdType.URL) {
      const urlResult = URL.create(value);
      if (urlResult.isErr()) {
        return err(urlResult.error);
      }
      return UrlOrCardId.createFromUrl(urlResult.value);
    } else if (type === UrlOrCardIdType.CARD) {
      const cardIdResult = CardId.createFromString(value);
      if (cardIdResult.isErr()) {
        return err(cardIdResult.error);
      }
      return UrlOrCardId.createFromCard(cardIdResult.value);
    } else {
      return err(new Error(`Invalid UrlOrCardId type: ${type}`));
    }
  }

  public equals(vo?: ValueObject<UrlOrCardIdProps>): boolean {
    if (vo === null || vo === undefined) return false;
    if (!(vo instanceof UrlOrCardId)) return false;

    if (this.type !== vo.type) return false;

    if (this.isUrl && vo.isUrl) {
      return this.url!.equals(vo.url!);
    } else if (this.isCard && vo.isCard) {
      return this.cardId!.equals(vo.cardId!);
    }

    return false;
  }
}
