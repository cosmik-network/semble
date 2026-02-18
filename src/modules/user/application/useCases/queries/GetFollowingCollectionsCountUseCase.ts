import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { IFollowsRepository } from '../../../domain/repositories/IFollowsRepository';
import { IIdentityResolutionService } from 'src/modules/atproto/domain/services/IIdentityResolutionService';
import { DIDOrHandle } from 'src/modules/atproto/domain/DIDOrHandle';
import { FollowTargetType } from '../../../domain/value-objects/FollowTargetType';

export interface GetFollowingCollectionsCountQuery {
  userId: string; // DID or handle
}

export interface GetFollowingCollectionsCountResult {
  count: number;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetFollowingCollectionsCountUseCase
  implements
    UseCase<
      GetFollowingCollectionsCountQuery,
      Result<GetFollowingCollectionsCountResult>
    >
{
  constructor(
    private followsRepository: IFollowsRepository,
    private identityResolver: IIdentityResolutionService,
  ) {}

  async execute(
    query: GetFollowingCollectionsCountQuery,
  ): Promise<Result<GetFollowingCollectionsCountResult>> {
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
      // Get count of collections that this user follows
      const countResult = await this.followsRepository.getFollowingCount(
        didResult.value.value,
        FollowTargetType.COLLECTION,
      );

      if (countResult.isErr()) {
        return err(
          new Error(
            `Failed to retrieve following collections count: ${countResult.error instanceof Error ? countResult.error.message : 'Unknown error'}`,
          ),
        );
      }

      return ok({
        count: countResult.value,
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to retrieve following collections count: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
