import { Result, ok, err } from '../../../../../shared/core/Result';
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';
import { IFollowsRepository } from '../../../domain/repositories/IFollowsRepository';
import { IFollowPublisher } from '../../ports/IFollowPublisher';
import { DID } from '../../../domain/value-objects/DID';
import { FollowTargetType } from '../../../domain/value-objects/FollowTargetType';

export interface UnfollowTargetDTO {
  followerId: string; // DID
  targetId: string; // DID or Collection UUID
  targetType: 'USER' | 'COLLECTION';
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class UnfollowTargetUseCase extends BaseUseCase<
  UnfollowTargetDTO,
  Result<void, ValidationError | AppError.UnexpectedError>
> {
  constructor(
    private followsRepository: IFollowsRepository,
    private followPublisher: IFollowPublisher,
    eventPublisher: IEventPublisher,
  ) {
    super(eventPublisher);
  }

  async execute(
    request: UnfollowTargetDTO,
  ): Promise<Result<void, ValidationError | AppError.UnexpectedError>> {
    try {
      // 1. Validate followerId (create DID value object)
      const followerDidResult = DID.create(request.followerId);
      if (followerDidResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid follower ID: ${followerDidResult.error.message}`,
          ),
        );
      }
      const followerDid = followerDidResult.value;

      // 2. Validate targetType
      const targetTypeResult = FollowTargetType.create(
        request.targetType as any,
      );
      if (targetTypeResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid target type: ${targetTypeResult.error.message}`,
          ),
        );
      }
      const targetType = targetTypeResult.value;

      // 3. Find existing follow record
      const existingFollowResult =
        await this.followsRepository.findByFollowerAndTarget(
          request.followerId,
          request.targetId,
          targetType,
        );

      if (existingFollowResult.isErr()) {
        return err(AppError.UnexpectedError.create(existingFollowResult.error));
      }

      // 4. If not found, return success (idempotent)
      if (!existingFollowResult.value) {
        return ok(undefined);
      }

      const follow = existingFollowResult.value;

      // 5. Unpublish from AT Protocol (if has publishedRecordId)
      if (follow.publishedRecordId) {
        const unpublishResult =
          await this.followPublisher.unpublishFollow(follow);
        if (unpublishResult.isErr()) {
          // Log but don't fail - we still want to delete locally
          console.error(
            'Failed to unpublish follow from AT Protocol:',
            unpublishResult.error,
          );
        }
      }

      // 6. Call markForRemoval() (raises UserUnfollowedTargetEvent)
      const markResult = follow.markForRemoval();
      if (markResult.isErr()) {
        return err(new ValidationError(markResult.error.message));
      }

      // 7. Delete from repository
      const deleteResult = await this.followsRepository.delete(
        request.followerId,
        request.targetId,
        targetType,
      );

      if (deleteResult.isErr()) {
        return err(AppError.UnexpectedError.create(deleteResult.error));
      }

      // 8. Publish domain events
      const publishEventsResult = await this.publishEventsForAggregate(follow);
      if (publishEventsResult.isErr()) {
        console.error(
          'Failed to publish domain events:',
          publishEventsResult.error,
        );
        // Don't fail the operation
      }

      // 9. Return success
      return ok(undefined);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
