import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { IFollowsRepository } from '../../../domain/repositories/IFollowsRepository';
import { ICollectionRepository } from 'src/modules/cards/domain/ICollectionRepository';
import { FollowTargetType } from '../../../domain/value-objects/FollowTargetType';
import { CollectionId } from 'src/modules/cards/domain/value-objects/CollectionId';

export interface GetCollectionFollowersCountQuery {
  collectionId: string; // Collection UUID
}

export interface GetCollectionFollowersCountResult {
  count: number;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetCollectionFollowersCountUseCase
  implements
    UseCase<
      GetCollectionFollowersCountQuery,
      Result<GetCollectionFollowersCountResult>
    >
{
  constructor(
    private followsRepository: IFollowsRepository,
    private collectionRepository: ICollectionRepository,
  ) {}

  async execute(
    query: GetCollectionFollowersCountQuery,
  ): Promise<Result<GetCollectionFollowersCountResult>> {
    // Validate collection ID
    const collectionIdResult = CollectionId.createFromString(
      query.collectionId,
    );
    if (collectionIdResult.isErr()) {
      return err(
        new ValidationError(
          `Invalid collection ID: ${collectionIdResult.error.message}`,
        ),
      );
    }

    try {
      // Verify collection exists
      const collectionResult = await this.collectionRepository.findById(
        collectionIdResult.value,
      );
      if (collectionResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch collection: ${collectionResult.error instanceof Error ? collectionResult.error.message : 'Unknown error'}`,
          ),
        );
      }
      if (!collectionResult.value) {
        return err(new ValidationError('Collection not found'));
      }

      // Get count of users following this collection
      const countResult = await this.followsRepository.getFollowersCount(
        query.collectionId,
        FollowTargetType.COLLECTION,
      );

      if (countResult.isErr()) {
        return err(
          new Error(
            `Failed to retrieve collection followers count: ${countResult.error instanceof Error ? countResult.error.message : 'Unknown error'}`,
          ),
        );
      }

      return ok({
        count: countResult.value,
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to retrieve collection followers count: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
