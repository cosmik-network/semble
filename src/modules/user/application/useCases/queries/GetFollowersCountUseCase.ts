import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { IFollowsRepository } from '../../../domain/repositories/IFollowsRepository';
import { IIdentityResolutionService } from 'src/modules/atproto/domain/services/IIdentityResolutionService';
import { DIDOrHandle } from 'src/modules/atproto/domain/DIDOrHandle';
import { FollowTargetType } from '../../../domain/value-objects/FollowTargetType';

export interface GetFollowersCountQuery {
  userId: string; // DID or handle
}

export interface GetFollowersCountResult {
  count: number;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetFollowersCountUseCase
  implements UseCase<GetFollowersCountQuery, Result<GetFollowersCountResult>>
{
  constructor(
    private followsRepository: IFollowsRepository,
    private identityResolver: IIdentityResolutionService,
  ) {}

  async execute(
    query: GetFollowersCountQuery,
  ): Promise<Result<GetFollowersCountResult>> {
    // Parse and validate user identifier
    const identifierResult = DIDOrHandle.create(query.userId);
    if (identifierResult.isErr()) {
      return err(new ValidationError('Invalid user identifier'));
    }

    // Resolve to DID
    const didResult = await this.identityResolver.resolveToDID(
      identifierResult.value,
    );
    if (didResult.isErr()) {
      return err(
        new ValidationError(
          `Could not resolve user identifier: ${didResult.error.message}`,
        ),
      );
    }

    try {
      // Get count of users following this user
      const countResult = await this.followsRepository.getFollowersCount(
        didResult.value.value,
        FollowTargetType.USER,
      );

      if (countResult.isErr()) {
        return err(
          new Error(
            `Failed to retrieve followers count: ${countResult.error instanceof Error ? countResult.error.message : 'Unknown error'}`,
          ),
        );
      }

      return ok({
        count: countResult.value,
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to retrieve followers count: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
