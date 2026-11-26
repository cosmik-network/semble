import { ValueObject } from '../../../../shared/domain/ValueObject';

interface AnnotationPassageProps {
  /** The raw selector.exact — the only embedded content */
  value: string;
  /** The stored exact_normalized value — the vector ID hash input */
  normalized: string;
}

/**
 * The searchable content of an annotation: the highlighted passage. Kept
 * separate from Chunk (URL title+description) because the two floors are
 * expected to be tuned independently — short passages embed with no context,
 * so passages below the floor are not indexed at all.
 */
export class AnnotationPassage extends ValueObject<AnnotationPassageProps> {
  private static readonly MIN_LENGTH = 25;

  get value(): string {
    return this.props.value;
  }

  get normalized(): string {
    return this.props.normalized;
  }

  private constructor(props: AnnotationPassageProps) {
    super(props);
  }

  public static create(
    exact: string,
    exactNormalized: string,
  ): AnnotationPassage {
    return new AnnotationPassage({ value: exact, normalized: exactNormalized });
  }

  public meetsMinLength(): boolean {
    return this.props.normalized.length >= AnnotationPassage.MIN_LENGTH;
  }

  public static getMinLength(): number {
    return AnnotationPassage.MIN_LENGTH;
  }
}
