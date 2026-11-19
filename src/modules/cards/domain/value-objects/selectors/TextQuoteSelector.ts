import { ValueObject } from '../../../../../shared/domain/ValueObject';
import { ok, err, Result } from '../../../../../shared/core/Result';
import { SelectorTypeEnum } from './SelectorType';
import { SelectorValidationError } from './SelectorValidationError';
import { normalizeQuotedText } from './normalizeQuotedText';
import { countGraphemes } from './countGraphemes';

interface TextQuoteSelectorProps {
  type: SelectorTypeEnum.TEXT_QUOTE;
  exact: string;
  prefix?: string;
  suffix?: string;
}

/**
 * Describes a text segment by quoting it, plus optional surrounding context.
 * Following the W3C Web Annotation Data Model: prefix/suffix exist to
 * disambiguate multiple occurrences of exact within the source document.
 */
export class TextQuoteSelector extends ValueObject<TextQuoteSelectorProps> {
  // Limits match the at.margin.note lexicon selector def, so anything the
  // domain accepts is publishable
  public static readonly MAX_EXACT_LENGTH = 5000;
  public static readonly MAX_EXACT_GRAPHEMES = 1500;
  public static readonly MAX_CONTEXT_LENGTH = 256;

  get type(): SelectorTypeEnum.TEXT_QUOTE {
    return this.props.type;
  }

  get exact(): string {
    return this.props.exact;
  }

  /**
   * The comparison key for "same passage" matching — raw exact is never
   * compared directly (see normalizeQuotedText).
   */
  get normalizedExact(): string {
    return normalizeQuotedText(this.props.exact);
  }

  get prefix(): string | undefined {
    return this.props.prefix;
  }

  get suffix(): string | undefined {
    return this.props.suffix;
  }

  private constructor(props: TextQuoteSelectorProps) {
    super(props);
  }

  public static create(props: {
    exact: string;
    prefix?: string;
    suffix?: string;
  }): Result<TextQuoteSelector, SelectorValidationError> {
    // Whitespace is part of the anchor (a selection can span blocks), so
    // exact is never trimmed — only rejected if empty once normalized.
    if (!props.exact || normalizeQuotedText(props.exact).length === 0) {
      return err(
        new SelectorValidationError('TextQuoteSelector must have exact text'),
      );
    }

    if (props.exact.length > this.MAX_EXACT_LENGTH) {
      return err(
        new SelectorValidationError(
          `TextQuoteSelector exact text cannot exceed ${this.MAX_EXACT_LENGTH} characters`,
        ),
      );
    }

    if (countGraphemes(props.exact) > this.MAX_EXACT_GRAPHEMES) {
      return err(
        new SelectorValidationError(
          `TextQuoteSelector exact text cannot exceed ${this.MAX_EXACT_GRAPHEMES} graphemes`,
        ),
      );
    }

    const prefixResult = this.validateContext('prefix', props.prefix);
    if (prefixResult.isErr()) {
      return err(prefixResult.error);
    }

    const suffixResult = this.validateContext('suffix', props.suffix);
    if (suffixResult.isErr()) {
      return err(suffixResult.error);
    }

    return ok(
      new TextQuoteSelector({
        type: SelectorTypeEnum.TEXT_QUOTE,
        exact: props.exact,
        prefix: props.prefix,
        suffix: props.suffix,
      }),
    );
  }

  private static validateContext(
    name: 'prefix' | 'suffix',
    value: string | undefined,
  ): Result<string | undefined, SelectorValidationError> {
    if (value === undefined) {
      return ok(undefined);
    }

    if (value.length === 0) {
      return err(
        new SelectorValidationError(
          `TextQuoteSelector ${name} cannot be empty — omit it instead`,
        ),
      );
    }

    if (value.length > this.MAX_CONTEXT_LENGTH) {
      return err(
        new SelectorValidationError(
          `TextQuoteSelector ${name} cannot exceed ${this.MAX_CONTEXT_LENGTH} characters`,
        ),
      );
    }

    return ok(value);
  }
}
