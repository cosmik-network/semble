import { err, Result } from '../../../shared/core/Result';
import { Card, CardValidationError } from './Card';
import { CardType, CardTypeEnum } from './value-objects/CardType';
import { CardContent } from './value-objects/CardContent';
import { CardId } from './value-objects/CardId';
import { CuratorId } from './value-objects/CuratorId';
import { URL } from './value-objects/URL';
import { UrlMetadata } from './value-objects/UrlMetadata';
import { Selector } from './value-objects/selectors/Selector';
import { SelectorTypeEnum } from './value-objects/selectors/SelectorType';

// Define interfaces for the different card creation inputs
export interface IUrlCardInput {
  type: CardTypeEnum.URL;
  url: string;
  metadata: UrlMetadata;
  viaCardId?: string;
}

export interface INoteCardInput {
  type: CardTypeEnum.NOTE;
  text: string;
  parentCardId?: string;
  url?: string;
}

export interface ITextQuoteSelectorInput {
  type: SelectorTypeEnum.TEXT_QUOTE;
  exact: string;
  prefix?: string;
  suffix?: string;
}

export interface IAnnotationCardInput {
  type: CardTypeEnum.ANNOTATION;
  url: string; // The source document the passage is selected from
  selectors: ITextQuoteSelectorInput[];
  note?: string;
  viaCardId?: string; // Set when saving an annotation discovered via another card
}

// Union type for all possible card creation inputs
export type CardCreationInput =
  | IUrlCardInput
  | INoteCardInput
  | IAnnotationCardInput;

interface CreateCardProps {
  curatorId: string;
  cardInput: CardCreationInput;
  createdAt?: Date;
}

export class CardFactory {
  static create(props: CreateCardProps): Result<Card, CardValidationError> {
    try {
      // Validate and create CuratorId
      const curatorIdResult = CuratorId.create(props.curatorId);
      if (curatorIdResult.isErr()) {
        return err(
          new CardValidationError(
            `Invalid curator ID: ${curatorIdResult.error.message}`,
          ),
        );
      }
      const curatorId = curatorIdResult.value;

      // Create CardType
      const cardTypeResult = CardType.create(props.cardInput.type);
      if (cardTypeResult.isErr()) {
        return err(
          new CardValidationError(
            `Invalid card type: ${cardTypeResult.error.message}`,
          ),
        );
      }
      const cardType = cardTypeResult.value;

      // Create CardContent based on type
      const contentResult = this.createCardContent(props.cardInput, curatorId);
      if (contentResult.isErr()) {
        return err(contentResult.error);
      }
      const content = contentResult.value;

      // Create parent card ID if provided
      let parentCardId: CardId | undefined;
      if (this.hasParentCardId(props.cardInput)) {
        const parentCardIdResult = CardId.createFromString(
          props.cardInput.parentCardId!,
        );
        if (parentCardIdResult.isErr()) {
          return err(
            new CardValidationError(
              `Invalid parent card ID: ${parentCardIdResult.error.message}`,
            ),
          );
        }
        parentCardId = parentCardIdResult.value;
      }

      // Create via card ID if provided
      let viaCardId: CardId | undefined;
      if (this.hasViaCardId(props.cardInput)) {
        const viaCardIdResult = CardId.createFromString(
          props.cardInput.viaCardId!,
        );
        if (viaCardIdResult.isErr()) {
          return err(
            new CardValidationError(
              `Invalid via card ID: ${viaCardIdResult.error.message}`,
            ),
          );
        }
        viaCardId = viaCardIdResult.value;
      }

      // Create URL if provided for URL cards (required) or optional for other card types
      let url: URL | undefined;
      if (props.cardInput.type === CardTypeEnum.URL) {
        const urlResult = URL.create(props.cardInput.url);
        if (urlResult.isErr()) {
          return err(
            new CardValidationError(`Invalid URL: ${urlResult.error.message}`),
          );
        }
        url = urlResult.value;
      } else if ('url' in props.cardInput && props.cardInput.url) {
        // Handle optional URL for NOTE cards (required for ANNOTATION cards,
        // enforced by Card.create)
        const urlResult = URL.create(props.cardInput.url);
        if (urlResult.isErr()) {
          return err(
            new CardValidationError(`Invalid URL: ${urlResult.error.message}`),
          );
        }
        url = urlResult.value;
      }

      // Create the card
      return Card.create({
        curatorId,
        type: cardType,
        content,
        url,
        parentCardId,
        viaCardId,
        createdAt: props.createdAt,
        updatedAt: props.createdAt,
      });
    } catch (error) {
      return err(
        new CardValidationError(
          error instanceof Error ? error.message : String(error),
        ),
      );
    }
  }

  private static createCardContent(
    cardInput: CardCreationInput,
    curatorId: CuratorId,
  ): Result<CardContent, CardValidationError> {
    switch (cardInput.type) {
      case CardTypeEnum.URL:
        return this.createUrlContent(cardInput);

      case CardTypeEnum.NOTE:
        return this.createNoteContent(cardInput);

      case CardTypeEnum.ANNOTATION:
        return this.createAnnotationContent(cardInput);

      default:
        return err(new CardValidationError('Invalid card type'));
    }
  }

  private static createUrlContent(
    input: IUrlCardInput,
  ): Result<CardContent, CardValidationError> {
    // Create URL value object
    const urlResult = URL.create(input.url);
    if (urlResult.isErr()) {
      return err(
        new CardValidationError(`Invalid URL: ${urlResult.error.message}`),
      );
    }

    const url = urlResult.value;

    // Require metadata for URL cards
    if (!input.metadata) {
      return err(
        new CardValidationError(
          'URL metadata is required for creating URL cards',
        ),
      );
    }

    return CardContent.createUrlContent(url, input.metadata);
  }

  private static createNoteContent(
    input: INoteCardInput,
  ): Result<CardContent, CardValidationError> {
    return CardContent.createNoteContent(input.text);
  }

  private static createAnnotationContent(
    input: IAnnotationCardInput,
  ): Result<CardContent, CardValidationError> {
    const selectors: Selector[] = [];
    for (const selectorInput of input.selectors) {
      switch (selectorInput.type) {
        case SelectorTypeEnum.TEXT_QUOTE: {
          const selectorResult = Selector.createTextQuote(selectorInput);
          if (selectorResult.isErr()) {
            return err(new CardValidationError(selectorResult.error.message));
          }
          selectors.push(selectorResult.value);
          break;
        }

        default:
          return err(
            new CardValidationError(
              `Invalid selector type: ${selectorInput.type}`,
            ),
          );
      }
    }

    return CardContent.createAnnotationContent(selectors, input.note);
  }

  // Type guards
  private static hasParentCardId(
    input: CardCreationInput,
  ): input is INoteCardInput {
    return 'parentCardId' in input && input.parentCardId !== undefined;
  }

  private static hasViaCardId(
    input: CardCreationInput,
  ): input is IUrlCardInput {
    return 'viaCardId' in input && input.viaCardId !== undefined;
  }
}
