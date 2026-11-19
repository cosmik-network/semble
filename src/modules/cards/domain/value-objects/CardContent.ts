import { ValueObject } from '../../../../shared/domain/ValueObject';
import { CardTypeEnum } from './CardType';
import { ok, err, Result } from '../../../../shared/core/Result';
import { UrlMetadata } from './UrlMetadata';
import { URL } from './URL';
import { UrlCardContent } from './content/UrlCardContent';
import { NoteCardContent } from './content/NoteCardContent';
import { AnnotationCardContent } from './content/AnnotationCardContent';
import { CuratorId } from './CuratorId';
import { Selector } from './selectors/Selector';

// Union type for all card content types
type CardContentUnion =
  | UrlCardContent
  | NoteCardContent
  | AnnotationCardContent;

export class CardContentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CardContentValidationError';
  }
}

export class CardContent extends ValueObject<{ content: CardContentUnion }> {
  get type(): CardTypeEnum {
    return this.props.content.type;
  }

  get content(): CardContentUnion {
    return this.props.content;
  }

  // Type-safe getters
  get urlContent(): UrlCardContent | null {
    return this.props.content instanceof UrlCardContent
      ? this.props.content
      : null;
  }

  get noteContent(): NoteCardContent | null {
    return this.props.content instanceof NoteCardContent
      ? this.props.content
      : null;
  }

  get annotationContent(): AnnotationCardContent | null {
    return this.props.content instanceof AnnotationCardContent
      ? this.props.content
      : null;
  }

  private constructor(content: CardContentUnion) {
    super({ content });
  }

  // Factory methods that delegate to specific content classes
  public static createUrlContent(
    url: URL,
    metadata?: UrlMetadata,
  ): Result<CardContent, CardContentValidationError> {
    const urlContentResult = UrlCardContent.create(url, metadata);
    if (urlContentResult.isErr()) {
      return err(
        new CardContentValidationError(urlContentResult.error.message),
      );
    }
    return ok(new CardContent(urlContentResult.value));
  }

  public static createNoteContent(
    text: string,
  ): Result<CardContent, CardContentValidationError> {
    // Use provided curatorId or create a dummy one for backward compatibility
    const noteContentResult = NoteCardContent.create(text);
    if (noteContentResult.isErr()) {
      return err(
        new CardContentValidationError(noteContentResult.error.message),
      );
    }
    return ok(new CardContent(noteContentResult.value));
  }

  public static createAnnotationContent(
    selectors: Selector[],
    note?: string,
  ): Result<CardContent, CardContentValidationError> {
    const annotationContentResult = AnnotationCardContent.create(
      selectors,
      note,
    );
    if (annotationContentResult.isErr()) {
      return err(
        new CardContentValidationError(annotationContentResult.error.message),
      );
    }
    return ok(new CardContent(annotationContentResult.value));
  }
}
