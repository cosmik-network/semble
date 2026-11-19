import { ValueObject } from '../../../../../shared/domain/ValueObject';
import { ok, err, Result } from '../../../../../shared/core/Result';
import { SelectorTypeEnum } from './SelectorType';
import { TextQuoteSelector } from './TextQuoteSelector';
import { SelectorValidationError } from './SelectorValidationError';

// Union of all selector types — mirrors how CardContent wraps content types.
// New selector families (TextPositionSelector, RangeSelector, ...) extend
// this union without changing AnnotationCardContent.
type SelectorUnion = TextQuoteSelector;

/**
 * A single selector describing the annotated segment. Multiple selectors on
 * one annotation are parallel descriptions of the same segment with different
 * precision (W3C Web Annotation Data Model), so a consumer can fall back to
 * whichever still resolves.
 */
export class Selector extends ValueObject<{ selector: SelectorUnion }> {
  get type(): SelectorTypeEnum {
    return this.props.selector.type;
  }

  // Type-safe getter
  get textQuoteSelector(): TextQuoteSelector | null {
    return this.props.selector instanceof TextQuoteSelector
      ? this.props.selector
      : null;
  }

  private constructor(selector: SelectorUnion) {
    super({ selector });
  }

  public static createTextQuote(props: {
    exact: string;
    prefix?: string;
    suffix?: string;
  }): Result<Selector, SelectorValidationError> {
    const textQuoteResult = TextQuoteSelector.create(props);
    if (textQuoteResult.isErr()) {
      return err(textQuoteResult.error);
    }
    return ok(new Selector(textQuoteResult.value));
  }
}
