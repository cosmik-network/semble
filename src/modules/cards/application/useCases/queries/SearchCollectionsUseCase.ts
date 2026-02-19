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
import { ProfileEnricher } from '../../services/ProfileEnricher';

export interface SearchCollectionsQuery {
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: CollectionSortField;
  sortOrder?: SortOrder;
  searchText?: string;
  identifier?: string; // Can be DID or handle
  accessType?: CollectionAccessType;
}

export interface SearchCollectionsResult {
  collections: CollectionDTO[];
  pagination: PaginationDTO;
  sorting: CollectionSortingDTO;
}

export class SearchCollectionsUseCase
  implements UseCase<SearchCollectionsQuery, Result<SearchCollectionsResult>>
{
  constructor(
    private collectionQueryRepo: ICollectionQueryRepository,
    private profileService: IProfileService,
    private identityResolutionService: IIdentityResolutionService,
    private followsRepository: IFollowsRepository,
  ) {}

  async execute(
    query: SearchCollectionsQuery,
  ): Promise<Result<SearchCollectionsResult>> {
    // Set defaults
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100
    const sortBy = query.sortBy || CollectionSortField.UPDATED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;

    try {
      // Resolve identifier to DID if provided
      let authorId: string | undefined;
      if (query.identifier) {
        const identifierResult = DIDOrHandle.create(query.identifier);
        if (identifierResult.isErr()) {
          return err(
            new Error(`Invalid identifier: ${identifierResult.error.message}`),
          );
        }

        const didResult = await this.identityResolutionService.resolveToDID(
          identifierResult.value,
        );
        if (didResult.isErr()) {
          return err(
            new Error(
              `Failed to resolve identifier to DID: ${didResult.error.message}`,
            ),
          );
        }

        authorId = didResult.value.value;
      }

      // Validate accessType if provided
      if (
        query.accessType &&
        !Object.values(CollectionAccessType).includes(query.accessType)
      ) {
        return err(new Error(`Invalid access type: ${query.accessType}`));
      }

      // Execute query to get raw collection data
      const result = await this.collectionQueryRepo.searchCollections({
        page,
        limit,
        sortBy,
        sortOrder,
        searchText: query.searchText,
        authorId,
        accessType: query.accessType,
      });

      // Get unique author IDs from the results
      const authorIds = [...new Set(result.items.map((item) => item.authorId))];

      // Fetch profiles for all authors using ProfileEnricher
      const profileEnricher = new ProfileEnricher(this.profileService);
      const profileMapResult = await profileEnricher.buildProfileMap(
        authorIds,
        undefined, // No calling user (no isFollowing needed)
        {
          skipFailures: true, // Skip collections with failed author profiles
          mapToUser: false, // Use inline profile (without isFollowing)
        },
      );

      if (profileMapResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch author profiles: ${profileMapResult.error.message}`,
          ),
        );
      }

      const profileMap = profileMapResult.value;

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
            accessType: item.accessType as CollectionAccessType,
            updatedAt: item.updatedAt.toISOString(),
            createdAt: item.createdAt.toISOString(),
            cardCount: item.cardCount,
            author: profile,
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
          `Failed to search collections: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
