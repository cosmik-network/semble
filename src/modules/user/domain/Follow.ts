import { AggregateRoot } from 'src/shared/domain/AggregateRoot';
import { UniqueEntityID } from 'src/shared/domain/UniqueEntityID';
import { Guard, IGuardArgument } from 'src/shared/core/Guard';
import { err, ok, Result } from 'src/shared/core/Result';
import { DID } from './value-objects/DID';
import { FollowTargetType } from './value-objects/FollowTargetType';

export interface FollowProps {
  followerId: DID;
  targetId: string;
  targetType: FollowTargetType;
  createdAt: Date;
}

export class Follow extends AggregateRoot<FollowProps> {
  get followId(): UniqueEntityID {
    return this._id;
  }

  get followerId(): DID {
    return this.props.followerId;
  }

  get targetId(): string {
    return this.props.targetId;
  }

  get targetType(): FollowTargetType {
    return this.props.targetType;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  private constructor(props: FollowProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static create(
    props: FollowProps,
    id?: UniqueEntityID,
  ): Result<Follow> {
    const guardArgs: IGuardArgument[] = [
      { argument: props.followerId, argumentName: 'followerId' },
      { argument: props.targetId, argumentName: 'targetId' },
      { argument: props.targetType, argumentName: 'targetType' },
      { argument: props.createdAt, argumentName: 'createdAt' },
    ];

    const guardResult = Guard.againstNullOrUndefinedBulk(guardArgs);

    if (guardResult.isErr()) {
      return err(new Error(guardResult.error));
    }

    const follow = new Follow(props, id);

    return ok(follow);
  }

  public static createNew(
    followerId: DID,
    targetId: string,
    targetType: FollowTargetType,
  ): Result<Follow> {
    const now = new Date();

    return Follow.create({
      followerId,
      targetId,
      targetType,
      createdAt: now,
    });
  }
}
