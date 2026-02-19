import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import {
  ICollectionQueryRepository,
  CollectionSortField,
  SortOrder,
} from '../../../domain/ICollectionQueryRepository';
import { IProfileService } from 'src/modules/cards/domain/services/IProfileService';
import {
  CollectionDTO,
  PaginationDTO,
  CollectionSortingDTO,
} from '@semble/types';
import { IIdentityResolutionService } from 'src/modules/atproto/domain/services/IIdentityResolutionService';
import { DIDOrHandle } from 'src/modules/atproto/domain/DIDOrHandle';
import { CollectionAccessType } from '../../../domain/Collection';
import { IFollowsRepository } from 'src/modules/user/domain/repositories/IFollowsRepository';
import { FollowTargetType } from 'src/modules/user/domain/value-objects/FollowTargetType';

export interface GetOpenCollectionsWithContributorQuery {
  contributorId: string; // DID or handle
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: CollectionSortField;
  sortOrder?: SortOrder;
}

export interface GetOpenCollectionsWithContributorResult {
  collections: CollectionDTO[];
  pagination: PaginationDTO;
  sorting: CollectionSortingDTO;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetOpenCollectionsWithContributorUseCase
  implements
    UseCase<
      GetOpenCollectionsWithContributorQuery,
      Result<GetOpenCollectionsWithContributorResult>
    >
{
  constructor(
    private collectionQueryRepo: ICollectionQueryRepository,
    private profileService: IProfileService,
    private identityResolver: IIdentityResolutionService,
    private followsRepository: IFollowsRepository,
  ) {}

  async execute(
    query: GetOpenCollectionsWithContributorQuery,
  ): Promise<Result<GetOpenCollectionsWithContributorResult>> {
    // Set defaults
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100
    const sortBy = query.sortBy || CollectionSortField.UPDATED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;

    // Parse and validate contributor identifier
    const identifierResult = DIDOrHandle.create(query.contributorId);
    if (identifierResult.isErr()) {
      return err(new ValidationError('Invalid contributor identifier'));
    }

    // Resolve to DID
    const didResult = await this.identityResolver.resolveToDID(
      identifierResult.value,
    );
    if (didResult.isErr()) {
      return err(
        new ValidationError(
          `Could not resolve contributor identifier: ${didResult.error.message}`,
        ),
      );
    }

    const contributorDid = didResult.value.value;

    try {
      // Execute query to get raw collection data
      const result =
        await this.collectionQueryRepo.getOpenCollectionsWithContributor({
          contributorId: contributorDid,
          page,
          limit,
          sortBy,
          sortOrder,
        });

      // Get unique author IDs from the results
      const authorIds = [...new Set(result.items.map((item) => item.authorId))];

      // Fetch profiles for all authors
      const profilePromises = authorIds.map((authorId) =>
        this.profileService.getProfile(authorId),
      );
      const profileResults = await Promise.all(profilePromises);

      // Create a map of authorId to profile for quick lookup
      const profileMap = new Map();
      profileResults.forEach((profileResult, index) => {
        if (profileResult.isOk()) {
          profileMap.set(authorIds[index], profileResult.value);
        }
      });

      // Transform raw data to enriched DTOs
      const enrichedCollections: CollectionDTO[] = result.items
        .map((item) => {
          const profile = profileMap.get(item.authorId);
          if (!profile) {
            // Skip collections where we couldn't fetch the profile
            return null;
          }

          return {
            id: item.id,
            uri: item.uri,
            name: item.name,
            description: item.description,
            accessType: CollectionAccessType.OPEN, // Always OPEN for this query
            updatedAt: item.updatedAt.toISOString(),
            createdAt: item.createdAt.toISOString(),
            cardCount: item.cardCount,
            author: {
              id: profile.id,
              name: profile.name,
              handle: profile.handle,
              avatarUrl: profile.avatarUrl,
              bannerUrl: profile.bannerUrl,
              description: profile.bio,
            },
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

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
          hasMore: page * limit < result.totalCount,
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
          `Failed to retrieve open collections with contributor: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
