import { ok, Result } from 'src/shared/core/Result';
import { ValueObject } from 'src/shared/domain/ValueObject';

export enum FollowTargetTypeEnum {
  USER = 'USER',
  COLLECTION = 'COLLECTION',
}

interface FollowTargetTypeProps {
  value: FollowTargetTypeEnum;
}

export class FollowTargetType extends ValueObject<FollowTargetTypeProps> {
  get value(): FollowTargetTypeEnum {
    return this.props.value;
  }

  private constructor(props: FollowTargetTypeProps) {
    super(props);
  }

  public static create(type: FollowTargetTypeEnum): Result<FollowTargetType> {
    return ok(new FollowTargetType({ value: type }));
  }

  public static get USER(): FollowTargetType {
    return new FollowTargetType({ value: FollowTargetTypeEnum.USER });
  }

  public static get COLLECTION(): FollowTargetType {
    return new FollowTargetType({ value: FollowTargetTypeEnum.COLLECTION });
  }

  public toString(): string {
    return this.props.value;
  }
}
