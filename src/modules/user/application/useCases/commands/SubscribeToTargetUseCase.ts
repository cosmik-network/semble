import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IFollowsRepository } from '../../../domain/repositories/IFollowsRepository';
import { DID } from '../../../domain/value-objects/DID';
import { FollowTargetType } from '../../../domain/value-objects/FollowTargetType';
import {
  SubscriptionScope,
  SubscriptionScopeEnum,
} from '../../../domain/value-objects/SubscriptionScope';

export interface SubscribeToTargetDTO {
  followerId: string;
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
  scopes?: SubscriptionScopeEnum[];
}

export interface SubscribeToTargetResponseDTO {
  followId: string;
  subscribedAt: string;
  scopes: SubscriptionScopeEnum[];
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

      const requestedScopes =
        request.scopes ?? SubscriptionScope.defaultForTarget(targetType);
      const scopesResult = SubscriptionScope.validForTarget(
        requestedScopes,
        targetType,
      );
      if (scopesResult.isErr()) {
        return err(new ValidationError(scopesResult.error.message));
      }
      const scopes = scopesResult.value;

      // Preserve subscribedAt when already subscribed (just updating scopes).
      const subscribedAt = follow.isSubscribed
        ? (follow.subscribedAt ?? new Date())
        : new Date();
      follow.markAsSubscribed(scopes, subscribedAt);

      const updateResult = await this.followsRepository.setSubscription(
        request.followerId,
        request.targetId,
        targetType,
        true,
        subscribedAt,
        scopes,
      );

      if (updateResult.isErr()) {
        return err(AppError.UnexpectedError.create(updateResult.error));
      }

      return ok({
        followId: follow.followId.toString(),
        subscribedAt: subscribedAt.toISOString(),
        scopes,
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
