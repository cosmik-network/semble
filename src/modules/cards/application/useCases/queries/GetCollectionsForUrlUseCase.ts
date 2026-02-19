import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import {
  ICollectionQueryRepository,
  CollectionSortField,
  SortOrder,
} from '../../../domain/ICollectionQueryRepository';
import { URL } from '../../../domain/value-objects/URL';
import { IProfileService } from '../../../domain/services/IProfileService';
import { ICollectionRepository } from '../../../domain/ICollectionRepository';
import { CollectionId } from '../../../domain/value-objects/CollectionId';
import { GetCollectionsForUrlResponse, Collection, User } from '@semble/types';
import { IFollowsRepository } from 'src/modules/user/domain/repositories/IFollowsRepository';
import { FollowTargetType } from 'src/modules/user/domain/value-objects/FollowTargetType';
import { ProfileEnricher } from '../../services/ProfileEnricher';

export interface GetCollectionsForUrlQuery {
  url: string;
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: CollectionSortField;
  sortOrder?: SortOrder;
}

// Use the shared API type directly
export type GetCollectionsForUrlResult = GetCollectionsForUrlResponse;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetCollectionsForUrlUseCase
  implements
    UseCase<GetCollectionsForUrlQuery, Result<GetCollectionsForUrlResult>>
{
  constructor(
    private collectionQueryRepo: ICollectionQueryRepository,
    private profileService: IProfileService,
    private collectionRepo: ICollectionRepository,
    private followsRepository: IFollowsRepository,
  ) {}

  async execute(
    query: GetCollectionsForUrlQuery,
  ): Promise<Result<GetCollectionsForUrlResult>> {
    // Validate URL
    const urlResult = URL.create(query.url);
    if (urlResult.isErr()) {
      return err(
        new ValidationError(`Invalid URL: ${urlResult.error.message}`),
      );
    }

    // Set defaults
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100
    const sortBy = query.sortBy || CollectionSortField.NAME;
    const sortOrder = query.sortOrder || SortOrder.ASC;

    try {
      // Execute query to get collections containing cards with this URL (raw data with authorId)
      const result = await this.collectionQueryRepo.getCollectionsWithUrl(
        urlResult.value.value,
        {
          page,
          limit,
          sortBy,
          sortOrder,
        },
      );

      // Build profile map using ProfileEnricher utility
      const profileEnricher = new ProfileEnricher(this.profileService);
      const uniqueAuthorIds = Array.from(
        new Set(result.items.map((item) => item.authorId)),
      );

      const profileMapResult = await profileEnricher.buildProfileMap(
        uniqueAuthorIds,
        query.callingUserId,
        { mapToUser: false }, // Use inline profile (without isFollowing)
      );

      if (profileMapResult.isErr()) {
        return err(profileMapResult.error);
      }

      const profileMap = profileMapResult.value;

      // Map items with enriched author data and full collection data
      const enrichedCollections: Collection[] = await Promise.all(
        result.items.map(async (item) => {
          const author = profileMap.get(item.authorId);
          if (!author) {
            throw new Error(`Profile not found for author ${item.authorId}`);
          }

          // Fetch full collection to get cardCount, dates
          const collectionIdResult = CollectionId.createFromString(item.id);
          if (collectionIdResult.isErr()) {
            throw new Error(`Invalid collection ID: ${item.id}`);
          }
          const collectionResult = await this.collectionRepo.findById(
            collectionIdResult.value,
          );
          if (collectionResult.isErr() || !collectionResult.value) {
            throw new Error(`Collection not found: ${item.id}`);
          }
          const collection = collectionResult.value;

          return {
            id: item.id,
            uri: item.uri,
            name: item.name,
            description: item.description,
            accessType: collection.accessType,
            author,
            cardCount: collection.cardCount,
            createdAt: collection.createdAt.toISOString(),
            updatedAt: collection.updatedAt.toISOString(),
          };
        }),
      );

      // Add follow status if callingUserId is provided
      if (query.callingUserId) {
        const followChecks = await Promise.all(
          enrichedCollections.map((c) =>
            this.followsRepository.findByFollowerAndTarget(
              query.callingUserId!,
              c.id,
              FollowTargetType.COLLECTION,
            ),
          ),
        );

        enrichedCollections.forEach((collection, i) => {
          collection.isFollowing =
            followChecks[i]?.isOk() && followChecks[i].value !== null;
        });
      }

      return ok({
        collections: enrichedCollections,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(result.totalCount / limit),
          totalCount: result.totalCount,
          hasMore: result.hasMore,
          limit,
        },
        sorting: {
          sortBy,
          sortOrder,
        },
      });
    } catch (error) {
      return err(
        new Error(
          `Failed to retrieve collections for URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
