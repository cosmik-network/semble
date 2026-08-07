import { Result, ok, err } from '../../../../../shared/core/Result';
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';
import { IFollowsRepository } from '../../../domain/repositories/IFollowsRepository';
import { IFollowPublisher } from '../../ports/IFollowPublisher';
import { DID } from '../../../domain/value-objects/DID';
import { FollowTargetType } from '../../../domain/value-objects/FollowTargetType';
import { Follow } from '../../../domain/Follow';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export interface FollowManyUsersDTO {
  followerId: string; // DID
  targetIds: string[]; // User DIDs
}

export interface FollowManyUsersResponseDTO {
  followedCount: number;
  alreadyFollowingCount: number;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Follows many users at once. Skips targets already followed, publishes the
 * new follow records to AT Protocol in bulk (applyWrites), then persists them.
 */
export class FollowManyUsersUseCase extends BaseUseCase<
  FollowManyUsersDTO,
  Result<FollowManyUsersResponseDTO, ValidationError | AppError.UnexpectedError>
> {
  constructor(
    private followsRepository: IFollowsRepository,
    private followPublisher: IFollowPublisher,
    eventPublisher: IEventPublisher,
  ) {
    super(eventPublisher);
  }

  async execute(
    request: FollowManyUsersDTO,
  ): Promise<
    Result<
      FollowManyUsersResponseDTO,
      ValidationError | AppError.UnexpectedError
    >
  > {
    try {
      const followerDidResult = DID.create(request.followerId);
      if (followerDidResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid follower ID: ${followerDidResult.error.message}`,
          ),
        );
      }
      const followerDid = followerDidResult.value;

      // Dedupe and drop self-follows
      const targetIds = Array.from(new Set(request.targetIds)).filter(
        (targetId) => targetId !== request.followerId,
      );

      for (const targetId of targetIds) {
        const targetDidResult = DID.create(targetId);
        if (targetDidResult.isErr()) {
          return err(
            new ValidationError(
              `Invalid target ID "${targetId}": ${targetDidResult.error.message}`,
            ),
          );
        }
      }

      if (targetIds.length === 0) {
        return ok({ followedCount: 0, alreadyFollowingCount: 0 });
      }

      // Skip targets already followed (idempotent)
      const followingResult =
        await this.followsRepository.checkFollowingMultiple(
          request.followerId,
          targetIds,
          FollowTargetType.USER,
        );
      if (followingResult.isErr()) {
        return err(AppError.UnexpectedError.create(followingResult.error));
      }
      const followingMap = followingResult.value;

      const newTargetIds = targetIds.filter((id) => !followingMap.get(id));
      const alreadyFollowingCount = targetIds.length - newTargetIds.length;

      if (newTargetIds.length === 0) {
        return ok({ followedCount: 0, alreadyFollowingCount });
      }

      const follows: Follow[] = [];
      for (const targetId of newTargetIds) {
        const followResult = Follow.createNew(
          followerDid,
          targetId,
          FollowTargetType.USER,
        );
        if (followResult.isErr()) {
          return err(new ValidationError(followResult.error.message));
        }
        follows.push(followResult.value);
      }

      // Publish all follow records to AT Protocol in bulk before saving
      const publishResult = await this.followPublisher.publishFollows(follows);
      if (publishResult.isErr()) {
        if (publishResult.error instanceof AuthenticationError) {
          return err(publishResult.error);
        }
        if (publishResult.error instanceof AppError.UnexpectedError) {
          return err(publishResult.error);
        }
        return err(new ValidationError(publishResult.error.message));
      }
      const publishedRecordIds = publishResult.value;

      let followedCount = 0;
      for (let i = 0; i < follows.length; i++) {
        const follow = follows[i]!;
        follow.markAsPublished(publishedRecordIds[i]!);

        const saveResult = await this.followsRepository.save(follow);
        if (saveResult.isErr()) {
          console.error(
            `Failed to save follow for target ${follow.targetId}:`,
            saveResult.error,
          );
          continue;
        }
        followedCount++;

        const eventResult = follow.raiseFollowedEvent();
        if (eventResult.isErr()) {
          console.error('Failed to raise followed event:', eventResult.error);
        }

        const publishEventsResult =
          await this.publishEventsForAggregate(follow);
        if (publishEventsResult.isErr()) {
          console.error(
            'Failed to publish domain events:',
            publishEventsResult.error,
          );
          // Don't fail the operation
        }
      }

      return ok({ followedCount, alreadyFollowingCount });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
