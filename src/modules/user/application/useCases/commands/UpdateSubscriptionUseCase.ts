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

export interface UpdateSubscriptionDTO {
  followerId: string;
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
  scopes: SubscriptionScopeEnum[];
}

export interface UpdateSubscriptionResponseDTO {
  followId: string;
  subscribedAt: string;
  scopes: SubscriptionScopeEnum[];
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class NotSubscribedError extends UseCaseError {
  constructor() {
    super('Not subscribed to target');
  }
}

export class UpdateSubscriptionUseCase implements UseCase<
  UpdateSubscriptionDTO,
  Result<
    UpdateSubscriptionResponseDTO,
    ValidationError | NotSubscribedError | AppError.UnexpectedError
  >
> {
  constructor(private followsRepository: IFollowsRepository) {}

  async execute(
    request: UpdateSubscriptionDTO,
  ): Promise<
    Result<
      UpdateSubscriptionResponseDTO,
      ValidationError | NotSubscribedError | AppError.UnexpectedError
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

      const scopesResult = SubscriptionScope.validForTarget(
        request.scopes,
        targetType,
      );
      if (scopesResult.isErr()) {
        return err(new ValidationError(scopesResult.error.message));
      }
      const scopes = scopesResult.value;

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
      if (!follow || !follow.isSubscribed) {
        return err(new NotSubscribedError());
      }

      follow.updateSubscriptionScopes(scopes);

      const subscribedAt = follow.subscribedAt ?? new Date();

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
