import { AggregateRoot } from 'src/shared/domain/AggregateRoot';
import { UniqueEntityID } from 'src/shared/domain/UniqueEntityID';
import { Guard, IGuardArgument } from 'src/shared/core/Guard';
import { err, ok, Result } from 'src/shared/core/Result';
import { DID } from './value-objects/DID';
import { FollowTargetType } from './value-objects/FollowTargetType';
import { PublishedRecordId } from '../../cards/domain/value-objects/PublishedRecordId';
import { UserUnfollowedTargetEvent } from './events/UserUnfollowedTargetEvent';
import { UserFollowedTargetEvent } from './events/UserFollowedTargetEvent';

export interface FollowProps {
  followerId: DID;
  targetId: string;
  targetType: FollowTargetType;
  publishedRecordId?: PublishedRecordId;
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

  get publishedRecordId(): PublishedRecordId | undefined {
    return this.props.publishedRecordId;
  }

  public markAsPublished(publishedRecordId: PublishedRecordId): void {
    this.props.publishedRecordId = publishedRecordId;
  }

  public markForRemoval(): Result<void> {
    const event = UserUnfollowedTargetEvent.create(
      this.followId,
      this.followerId,
      this.targetId,
      this.targetType,
    );

    if (event.isErr()) {
      return err(new Error(event.error.message));
    }

    this.addDomainEvent(event.value);
    return ok(undefined);
  }

  public raiseFollowedEvent(): Result<void> {
    const event = UserFollowedTargetEvent.create(
      this.followId,
      this.followerId,
      this.targetId,
      this.targetType,
      this.createdAt,
    );

    if (event.isErr()) {
      return err(new Error(event.error.message));
    }

    this.addDomainEvent(event.value);
    return ok(undefined);
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
