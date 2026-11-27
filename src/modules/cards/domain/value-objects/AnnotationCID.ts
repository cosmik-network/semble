import { ValueObject } from '../../../../shared/domain/ValueObject';
import { Result, ok, err } from '../../../../shared/core/Result';
import { computeAnnotationCID } from '@semble/types';

export class InvalidAnnotationCIDError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAnnotationCIDError';
  }
}

interface AnnotationCIDProps {
  value: string;
}

// Base36 of a 96-bit number: 18 or 19 chars
const ANNOTATION_CID_PATTERN = /^[0-9a-z]{18,19}$/;

/**
 * Stable content ID for an annotation passage — one CID per distinct passage
 * per URL, shared across every user/card that annotates it. The derivation
 * lives in @semble/types (computeAnnotationCID) so the webapp and extension
 * can compute the same value client-side; this value object wraps it for the
 * server modules and is the single identity used for the vector DB id, the
 * persisted annotation_selectors.annotation_cid column, and the
 * /annotation/{cid} page route.
 */
export class AnnotationCID extends ValueObject<AnnotationCIDProps> {
  get value(): string {
    return this.props.value;
  }

  private constructor(props: AnnotationCIDProps) {
    super(props);
  }

  /**
   * Derive the CID from a passage. Inputs must be the *stored* forms — the
   * canonical URL value (cards.url) and the exact_normalized produced by
   * normalizeQuotedText at write time — never re-derived ad hoc, so writers
   * and lookups can never disagree.
   */
  public static fromPassage(
    url: string,
    exactNormalized: string,
  ): Result<AnnotationCID, InvalidAnnotationCIDError> {
    const cid = computeAnnotationCID(url, exactNormalized);
    if (!ANNOTATION_CID_PATTERN.test(cid)) {
      // Unreachable unless the shared derivation changes format
      return err(
        new InvalidAnnotationCIDError(
          `Derived annotation CID has unexpected format: ${cid}`,
        ),
      );
    }
    return ok(new AnnotationCID({ value: cid }));
  }

  /** Validate an inbound CID (API query param, route segment) */
  public static createFromString(
    value: string,
  ): Result<AnnotationCID, InvalidAnnotationCIDError> {
    if (!value || !ANNOTATION_CID_PATTERN.test(value)) {
      return err(
        new InvalidAnnotationCIDError(
          'Annotation CID must be 18–19 lowercase alphanumeric characters',
        ),
      );
    }
    return ok(new AnnotationCID({ value }));
  }

  public toString(): string {
    return this.props.value;
  }
}
