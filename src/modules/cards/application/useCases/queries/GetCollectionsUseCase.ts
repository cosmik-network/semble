import { err, ok, Result } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import {
  ICollectionQueryRepository,
  CollectionSortField,
  SortOrder,
} from '../../../domain/ICollectionQueryRepository';
import { IProfileService } from 'src/modules/cards/domain/services/IProfileService';
import { DIDOrHandle } from 'src/modules/atproto/domain/DIDOrHandle';
import { IIdentityResolutionService } from 'src/modules/atproto/domain/services/IIdentityResolutionService';
import {
  CollectionDTO,
  PaginationDTO,
  CollectionSortingDTO,
} from '@semble/types';

export interface GetCollectionsQuery {
  curatorId: string;
  page?: number;
  limit?: number;
  sortBy?: CollectionSortField;
  sortOrder?: SortOrder;
  searchText?: string;
}

export interface GetCollectionsResult {
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

export class GetCollectionsUseCase
  implements UseCase<GetCollectionsQuery, Result<GetCollectionsResult>>
{
  constructor(
    private collectionQueryRepo: ICollectionQueryRepository,
    private profileService: IProfileService,
    private identityResolver: IIdentityResolutionService,
  ) {}

  async execute(
    query: GetCollectionsQuery,
  ): Promise<Result<GetCollectionsResult>> {
    // Set defaults
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100
    const sortBy = query.sortBy || CollectionSortField.UPDATED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;

    // Parse and validate curator identifier
    const identifierResult = DIDOrHandle.create(query.curatorId);
    if (identifierResult.isErr()) {
      return err(new ValidationError('Invalid curator identifier'));
    }

    // Resolve to DID
    const didResult = await this.identityResolver.resolveToDID(
      identifierResult.value,
    );
    if (didResult.isErr()) {
      return err(
        new ValidationError(
          `Could not resolve curator identifier: ${didResult.error.message}`,
        ),
      );
    }

    const resolvedDid = didResult.value.value;

    try {
      // Execute query to get raw collection data using the resolved DID
      const result = await this.collectionQueryRepo.findByCreator(resolvedDid, {
        page,
        limit,
        sortBy,
        sortOrder,
        searchText: query.searchText,
      });

      // Get user profile for the curator using the resolved DID
      const profileResult = await this.profileService.getProfile(resolvedDid);

      if (profileResult.isErr()) {
        return err(
          new Error(
            `Failed to fetch user profile: ${profileResult.error instanceof Error ? profileResult.error.message : 'Unknown error'}`,
          ),
        );
      }
      const profile = profileResult.value;

      // Transform raw data to enriched DTOs
      const enrichedCollections: CollectionDTO[] = result.items.map((item) => {
        return {
          id: item.id,
          uri: item.uri,
          name: item.name,
          description: item.description,
          accessType: item.accessType as 'OPEN' | 'CLOSED',
          updatedAt: item.updatedAt.toISOString(),
          createdAt: item.createdAt.toISOString(),
          cardCount: item.cardCount,
          author: {
            id: profile.id,
            name: profile.name,
            handle: profile.handle,
            avatarUrl: profile.avatarUrl,
            description: profile.bio,
          },
        };
      });

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
          `Failed to retrieve collections: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
