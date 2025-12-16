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

export interface SearchCollectionsQuery {
  page?: number;
  limit?: number;
  sortBy?: CollectionSortField;
  sortOrder?: SortOrder;
  searchText?: string;
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
      // Execute query to get raw collection data
      const result = await this.collectionQueryRepo.searchCollections({
        page,
        limit,
        sortBy,
        sortOrder,
        searchText: query.searchText,
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
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

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
