import { ValueObject } from '../../../../shared/domain/ValueObject';
import { Result, ok, err } from '../../../../shared/core/Result';

export enum SourceTypeEnum {
  MARGIN = 'margin',
}

export class SourceTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceTypeError';
  }
}

interface SourceTypeProps {
  value: SourceTypeEnum;
}

export class SourceType extends ValueObject<SourceTypeProps> {
  get value(): SourceTypeEnum {
    return this.props.value;
  }

  private constructor(props: SourceTypeProps) {
    super(props);
  }

  public static create(value: string): Result<SourceType, SourceTypeError> {
    if (!Object.values(SourceTypeEnum).includes(value as SourceTypeEnum)) {
      return err(new SourceTypeError(`Invalid source type: ${value}`));
    }

    return ok(new SourceType({ value: value as SourceTypeEnum }));
  }

  public static margin(): Result<SourceType, SourceTypeError> {
    return ok(new SourceType({ value: SourceTypeEnum.MARGIN }));
  }

  public toString(): string {
    return this.props.value;
  }
}
