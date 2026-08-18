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

export class GetCollectionsForUrlUseCase implements UseCase<
  GetCollectionsForUrlQuery,
  Result<GetCollectionsForUrlResult>
> {
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
    const sortBy = query.sortBy || CollectionSortField.ADDED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;

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
        {
          skipFailures: true, // Skip profiles that fail to resolve
          mapToUser: false, // Use inline profile (without isFollowing)
        },
      );

      if (profileMapResult.isErr()) {
        return err(profileMapResult.error);
      }

      const profileMap = profileMapResult.value;

      // Map items with enriched author data and full collection data
      // Filter out collections with missing author profiles
      const enrichedCollections = result.items
        .map((item) => {
          const author = profileMap.get(item.authorId);
          if (!author) {
            return null; // Skip collections with missing author profiles
          }

          return {
            id: item.id,
            uri: item.uri,
            name: item.name,
            description: item.description,
            accessType: item.accessType,
            author,
            cardCount: item.cardCount,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
          };
        })
        .filter((collection) => collection !== null) as Collection[];

      // Add follow status if callingUserId is provided
      if (query.callingUserId) {
        const followsResult =
          await this.followsRepository.findByFollowerAndTargets(
            query.callingUserId,
            enrichedCollections.map((c) => c.id),
            FollowTargetType.COLLECTION,
          );

        const followedCollectionIds = new Set(
          followsResult.isOk()
            ? followsResult.value.map((follow) => follow.targetId)
            : [],
        );

        enrichedCollections.forEach((collection) => {
          collection.isFollowing = followedCollectionIds.has(collection.id);
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
