import { ValueObject } from '../../../../../shared/domain/ValueObject';
import { ok, err, Result } from '../../../../../shared/core/Result';
import { CardTypeEnum } from '../CardType';
import { Selector } from '../selectors/Selector';
import { TextQuoteSelector } from '../selectors/TextQuoteSelector';
import { countGraphemes } from '../selectors/countGraphemes';

export class AnnotationCardContentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnnotationCardContentValidationError';
  }
}

interface AnnotationCardContentProps {
  type: CardTypeEnum.ANNOTATION;
  selectors: Selector[];
  note?: string;
}

/**
 * An annotation is a passage from a website (identified by one or more
 * selectors) with an optional note. The source document lives on the card
 * itself (Card.url), not in the content.
 */
export class AnnotationCardContent extends ValueObject<AnnotationCardContentProps> {
  // Note limits match the at.margin.note lexicon body def (value field), so
  // anything the domain accepts is publishable
  public static readonly MAX_NOTE_LENGTH = 10000;
  public static readonly MAX_NOTE_GRAPHEMES = 3000;
  public static readonly MAX_SELECTORS = 4;

  get type(): CardTypeEnum.ANNOTATION {
    return this.props.type;
  }

  get selectors(): Selector[] {
    return [...this.props.selectors]; // Defensive copy
  }

  get note(): string | undefined {
    return this.props.note;
  }

  get textQuoteSelector(): TextQuoteSelector | undefined {
    return (
      this.props.selectors.find(
        (selector) => selector.textQuoteSelector !== null,
      )?.textQuoteSelector ?? undefined
    );
  }

  private constructor(props: AnnotationCardContentProps) {
    super(props);
  }

  public static create(
    selectors: Selector[],
    note?: string,
  ): Result<AnnotationCardContent, AnnotationCardContentValidationError> {
    if (!selectors || selectors.length === 0) {
      return err(
        new AnnotationCardContentValidationError(
          'Annotation must have at least one selector',
        ),
      );
    }

    if (selectors.length > this.MAX_SELECTORS) {
      return err(
        new AnnotationCardContentValidationError(
          `Annotation cannot have more than ${this.MAX_SELECTORS} selectors`,
        ),
      );
    }

    // Parallel selectors describe the same segment with different precision;
    // two selectors of the same type is a modeling error, not redundancy.
    const seenTypes = new Set<string>();
    for (const selector of selectors) {
      if (seenTypes.has(selector.type)) {
        return err(
          new AnnotationCardContentValidationError(
            `Annotation cannot have multiple ${selector.type} selectors`,
          ),
        );
      }
      seenTypes.add(selector.type);
    }

    if (note !== undefined) {
      if (note.trim().length === 0) {
        return err(
          new AnnotationCardContentValidationError(
            'Annotation note cannot be empty',
          ),
        );
      }

      if (note.length > this.MAX_NOTE_LENGTH) {
        return err(
          new AnnotationCardContentValidationError(
            `Annotation note cannot exceed ${this.MAX_NOTE_LENGTH} characters`,
          ),
        );
      }

      if (countGraphemes(note) > this.MAX_NOTE_GRAPHEMES) {
        return err(
          new AnnotationCardContentValidationError(
            `Annotation note cannot exceed ${this.MAX_NOTE_GRAPHEMES} graphemes`,
          ),
        );
      }
    }

    return ok(
      new AnnotationCardContent({
        type: CardTypeEnum.ANNOTATION,
        selectors: [...selectors], // Defensive copy
        note: note?.trim(),
      }),
    );
  }
}
