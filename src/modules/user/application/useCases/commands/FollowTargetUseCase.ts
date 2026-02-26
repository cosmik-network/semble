import { Result, ok, err } from '../../../../../shared/core/Result';
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';
import { IFollowsRepository } from '../../../domain/repositories/IFollowsRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { ICollectionRepository } from '../../../../cards/domain/ICollectionRepository';
import { IFollowPublisher } from '../../ports/IFollowPublisher';
import { DID } from '../../../domain/value-objects/DID';
import { FollowTargetType } from '../../../domain/value-objects/FollowTargetType';
import { Follow } from '../../../domain/Follow';
import { CollectionId } from '../../../../cards/domain/value-objects/CollectionId';
import { PublishedRecordId } from '../../../../cards/domain/value-objects/PublishedRecordId';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';
import { IProfileService } from '../../../../cards/domain/services/IProfileService';
import {
  ICardQueryRepository,
  CardSortField,
  SortOrder,
} from '../../../../cards/domain/ICardQueryRepository';

export interface FollowTargetDTO {
  followerId: string; // DID
  targetId: string; // DID or Collection UUID
  targetType: 'USER' | 'COLLECTION';
  publishedRecordId?: PublishedRecordId; // For firehose events - skip publishing if provided
}

export interface FollowTargetResponseDTO {
  followId: string;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class FollowTargetUseCase extends BaseUseCase<
  FollowTargetDTO,
  Result<FollowTargetResponseDTO, ValidationError | AppError.UnexpectedError>
> {
  constructor(
    private followsRepository: IFollowsRepository,
    private userRepository: IUserRepository,
    private collectionRepository: ICollectionRepository,
    private followPublisher: IFollowPublisher,
    private profileService: IProfileService,
    private cardQueryRepository: ICardQueryRepository,
    eventPublisher: IEventPublisher,
  ) {
    super(eventPublisher);
  }

  async execute(
    request: FollowTargetDTO,
  ): Promise<
    Result<FollowTargetResponseDTO, ValidationError | AppError.UnexpectedError>
  > {
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

      // 3. Prevent self-follows (only for USER type)
      if (
        targetType.value === 'USER' &&
        request.followerId === request.targetId
      ) {
        return err(new ValidationError('Users cannot follow themselves'));
      }

      // 4. Validate target exists
      if (targetType.value === 'USER') {
        const targetDidResult = DID.create(request.targetId);
        if (targetDidResult.isErr()) {
          return err(
            new ValidationError(
              `Invalid target ID: ${targetDidResult.error.message}`,
            ),
          );
        }

        const userResult = await this.userRepository.findByDID(
          targetDidResult.value,
        );
        if (userResult.isErr()) {
          return err(AppError.UnexpectedError.create(userResult.error));
        }

        if (!userResult.value) {
          // User not in user table, check if they have at least 1 card
          const cardsResult = await this.cardQueryRepository.getUrlCardsOfUser(
            request.targetId,
            {
              page: 1,
              limit: 1,
              sortBy: CardSortField.CREATED_AT,
              sortOrder: SortOrder.DESC,
            },
          );

          if (cardsResult.totalCount === 0) {
            return err(new ValidationError('Target user not found'));
          }
          // User has cards, allow follow to proceed
        }
      } else if (targetType.value === 'COLLECTION') {
        const collectionIdResult = CollectionId.createFromString(
          request.targetId,
        );
        if (collectionIdResult.isErr()) {
          return err(
            new ValidationError(
              `Invalid collection ID: ${collectionIdResult.error.message}`,
            ),
          );
        }

        const collectionResult = await this.collectionRepository.findById(
          collectionIdResult.value,
        );
        if (collectionResult.isErr()) {
          return err(AppError.UnexpectedError.create(collectionResult.error));
        }

        if (!collectionResult.value) {
          return err(new ValidationError('Target collection not found'));
        }
      }

      // 5. Check if already following (idempotent)
      const existingFollowResult =
        await this.followsRepository.findByFollowerAndTarget(
          request.followerId,
          request.targetId,
          targetType,
        );

      if (existingFollowResult.isErr()) {
        return err(AppError.UnexpectedError.create(existingFollowResult.error));
      }

      if (existingFollowResult.value) {
        // Already following - return success with existing follow ID
        return ok({
          followId: existingFollowResult.value.followId.toString(),
        });
      }

      // 6. Create Follow aggregate (does NOT raise event yet)
      const followResult = Follow.createNew(
        followerDid,
        request.targetId,
        targetType,
      );

      if (followResult.isErr()) {
        return err(new ValidationError(followResult.error.message));
      }

      let follow = followResult.value;

      // 7. Publish to AT Protocol BEFORE saving (skip if publishedRecordId provided from firehose)
      let publishedRecordId: PublishedRecordId;

      if (request.publishedRecordId) {
        // Firehose event - already published, just use the provided ID
        publishedRecordId = request.publishedRecordId;
      } else {
        // Normal flow - publish to AT Protocol
        const publishResult = await this.followPublisher.publishFollow(follow);

        if (publishResult.isErr()) {
          // Propagate authentication errors
          if (publishResult.error instanceof AuthenticationError) {
            return err(publishResult.error);
          }
          if (publishResult.error instanceof AppError.UnexpectedError) {
            return err(publishResult.error);
          }
          return err(new ValidationError(publishResult.error.message));
        }

        publishedRecordId = publishResult.value;
      }

      // 8. Mark follow as published with the publishedRecordId
      follow.markAsPublished(publishedRecordId);

      // 9. Save to repository with publishedRecordId
      const saveResult = await this.followsRepository.save(follow);
      if (saveResult.isErr()) {
        return err(AppError.UnexpectedError.create(saveResult.error));
      }

      // 10. Raise UserFollowedTargetEvent (now that publish succeeded)
      const eventResult = follow.raiseFollowedEvent();
      if (eventResult.isErr()) {
        console.error('Failed to raise followed event:', eventResult.error);
      }

      // 11. Publish domain events
      const publishEventsResult = await this.publishEventsForAggregate(follow);
      if (publishEventsResult.isErr()) {
        console.error(
          'Failed to publish domain events:',
          publishEventsResult.error,
        );
        // Don't fail the operation
      }

      // 12. Invalidate profile counts cache
      // Invalidate follower's counts (followingCount increased)
      if (this.profileService.invalidateCounts) {
        await this.profileService.invalidateCounts(request.followerId);
      }
      // Invalidate target's counts (followerCount increased, only for USER targets)
      if (targetType.value === 'USER' && this.profileService.invalidateCounts) {
        await this.profileService.invalidateCounts(request.targetId);
      }

      // 13. Return success
      return ok({
        followId: follow.followId.toString(),
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
