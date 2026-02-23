import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { ICollectionQueryRepository } from '../../../domain/ICollectionQueryRepository';
import { IProfileService } from 'src/modules/cards/domain/services/IProfileService';
import { ICollectionRepository } from 'src/modules/cards/domain/ICollectionRepository';
import { CollectionId } from 'src/modules/cards/domain/value-objects/CollectionId';
import { ContributorUser } from '@semble/types';
import { ProfileEnricher } from 'src/modules/cards/application/services/ProfileEnricher';

export interface GetCollectionContributorsQuery {
  collectionId: string; // Collection UUID
  callingUserId?: string;
  page?: number;
  limit?: number;
}

export interface GetCollectionContributorsResult {
  users: ContributorUser[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
    limit: number;
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetCollectionContributorsUseCase
  implements
    UseCase<
      GetCollectionContributorsQuery,
      Result<GetCollectionContributorsResult>
    >
{
  constructor(
    private collectionQueryRepository: ICollectionQueryRepository,
    private profileService: IProfileService,
    private collectionRepository: ICollectionRepository,
  ) {}

  async execute(
    query: GetCollectionContributorsQuery,
  ): Promise<Result<GetCollectionContributorsResult>> {
    // Set defaults
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100

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

      const collection = collectionResult.value;
      const authorId = collection.authorId.value;

      // Get contributors from repository (excluding author)
      const contributorsResult =
        await this.collectionQueryRepository.getCollectionContributors(
          query.collectionId,
          authorId,
          { page, limit },
        );

      const totalCount = contributorsResult.totalCount;

      // Extract unique contributor IDs
      const uniqueContributorIds = contributorsResult.items.map(
        (item) => item.userId,
      );

      if (uniqueContributorIds.length === 0) {
        return ok({
          users: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalCount: 0,
            hasMore: false,
            limit,
          },
        });
      }

      // Fetch profiles for all contributors using ProfileEnricher
      const profileEnricher = new ProfileEnricher(this.profileService);
      const profileMapResult = await profileEnricher.buildProfileMap(
        uniqueContributorIds,
        query.callingUserId,
        {
          skipFailures: false, // Fail if any profile fetch fails
          mapToUser: true, // Use full User DTO with isFollowing
        },
      );

      if (profileMapResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch user profiles: ${profileMapResult.error.message}`,
          ),
        );
      }

      const profileMap = profileMapResult.value;

      // Build users array in the order of contributors (chronological by most recent contribution)
      // Add contributionCount to each user
      const users: ContributorUser[] = contributorsResult.items
        .map((item) => {
          const user = profileMap.get(item.userId);
          if (!user) {
            return undefined;
          }
          return {
            ...user,
            contributionCount: item.contributionCount,
          };
        })
        .filter((user): user is ContributorUser => user !== undefined);

      return ok({
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasMore: page * limit < totalCount,
          limit,
        },
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to retrieve collection contributors: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
