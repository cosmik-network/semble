import { IDomainEvent } from '../../../../shared/domain/events/IDomainEvent';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { DID } from '../value-objects/DID';
import { FollowTargetType } from '../value-objects/FollowTargetType';
import { EventNames } from '../../../../shared/infrastructure/events/EventConfig';
import { Result, ok } from '../../../../shared/core/Result';

export class UserUnfollowedTargetEvent implements IDomainEvent {
  public readonly eventName = EventNames.USER_UNFOLLOWED_TARGET;
  public readonly dateTimeOccurred: Date;

  private constructor(
    public readonly followId: UniqueEntityID,
    public readonly followerId: DID,
    public readonly targetId: string,
    public readonly targetType: FollowTargetType,
    dateTimeOccurred?: Date,
  ) {
    this.dateTimeOccurred = dateTimeOccurred || new Date();
  }

  public static create(
    followId: UniqueEntityID,
    followerId: DID,
    targetId: string,
    targetType: FollowTargetType,
  ): Result<UserUnfollowedTargetEvent> {
    return ok(
      new UserUnfollowedTargetEvent(followId, followerId, targetId, targetType),
    );
  }

  public static reconstruct(
    followId: UniqueEntityID,
    followerId: DID,
    targetId: string,
    targetType: FollowTargetType,
    dateTimeOccurred: Date,
  ): Result<UserUnfollowedTargetEvent> {
    return ok(
      new UserUnfollowedTargetEvent(
        followId,
        followerId,
        targetId,
        targetType,
        dateTimeOccurred,
      ),
    );
  }

  getAggregateId(): UniqueEntityID {
    return this.followId;
  }
}
