import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IFollowsRepository } from '../../../domain/repositories/IFollowsRepository';
import { DID } from '../../../domain/value-objects/DID';
import { FollowTargetType } from '../../../domain/value-objects/FollowTargetType';

export interface SubscribeToTargetDTO {
  followerId: string;
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
}

export interface SubscribeToTargetResponseDTO {
  followId: string;
  subscribedAt: string;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class NotFollowingError extends UseCaseError {
  constructor() {
    super('Must follow target before subscribing');
  }
}

export class SubscribeToTargetUseCase implements UseCase<
  SubscribeToTargetDTO,
  Result<
    SubscribeToTargetResponseDTO,
    ValidationError | NotFollowingError | AppError.UnexpectedError
  >
> {
  constructor(private followsRepository: IFollowsRepository) {}

  async execute(
    request: SubscribeToTargetDTO,
  ): Promise<
    Result<
      SubscribeToTargetResponseDTO,
      ValidationError | NotFollowingError | AppError.UnexpectedError
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

      const existingFollowResult =
        await this.followsRepository.findByFollowerAndTarget(
          request.followerId,
          request.targetId,
          targetType,
        );

      if (existingFollowResult.isErr()) {
        return err(AppError.UnexpectedError.create(existingFollowResult.error));
      }

      const follow = existingFollowResult.value;
      if (!follow) {
        return err(new NotFollowingError());
      }

      if (follow.isSubscribed) {
        return ok({
          followId: follow.followId.toString(),
          subscribedAt: (follow.subscribedAt ?? new Date()).toISOString(),
        });
      }

      const now = new Date();
      follow.markAsSubscribed(now);

      const updateResult = await this.followsRepository.setSubscription(
        request.followerId,
        request.targetId,
        targetType,
        true,
        now,
      );

      if (updateResult.isErr()) {
        return err(AppError.UnexpectedError.create(updateResult.error));
      }

      return ok({
        followId: follow.followId.toString(),
        subscribedAt: now.toISOString(),
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
