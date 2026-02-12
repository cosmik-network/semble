import { IDomainEvent } from '../../../../shared/domain/events/IDomainEvent';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { DID } from '../value-objects/DID';
import { FollowTargetType } from '../value-objects/FollowTargetType';
import { EventNames } from '../../../../shared/infrastructure/events/EventConfig';
import { Result, ok } from '../../../../shared/core/Result';

export class UserFollowedTargetEvent implements IDomainEvent {
  public readonly eventName = EventNames.USER_FOLLOWED_TARGET;
  public readonly dateTimeOccurred: Date;

  private constructor(
    public readonly followId: UniqueEntityID,
    public readonly followerId: DID,
    public readonly targetId: string,
    public readonly targetType: FollowTargetType,
    public readonly createdAt: Date,
    dateTimeOccurred?: Date,
  ) {
    this.dateTimeOccurred = dateTimeOccurred || new Date();
  }

  public static create(
    followId: UniqueEntityID,
    followerId: DID,
    targetId: string,
    targetType: FollowTargetType,
    createdAt: Date,
  ): Result<UserFollowedTargetEvent> {
    return ok(
      new UserFollowedTargetEvent(
        followId,
        followerId,
        targetId,
        targetType,
        createdAt,
      ),
    );
  }

  public static reconstruct(
    followId: UniqueEntityID,
    followerId: DID,
    targetId: string,
    targetType: FollowTargetType,
    createdAt: Date,
    dateTimeOccurred: Date,
  ): Result<UserFollowedTargetEvent> {
    return ok(
      new UserFollowedTargetEvent(
        followId,
        followerId,
        targetId,
        targetType,
        createdAt,
        dateTimeOccurred,
      ),
    );
  }

  getAggregateId(): UniqueEntityID {
    return this.followId;
  }
}
