import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import {
  ICardQueryRepository,
  CardSortField,
  SortOrder,
} from '../../../domain/ICardQueryRepository';
import { URL } from '../../../domain/value-objects/URL';
import { IProfileService } from '../../../domain/services/IProfileService';
import {
  UserProfileDTO,
  UrlCardDTO,
  PaginationDTO,
  CardSortingDTO,
} from '@semble/types';
import { ProfileEnricher } from '../../services/ProfileEnricher';

export interface GetLibrariesForUrlQuery {
  url: string;
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: CardSortField;
  sortOrder?: SortOrder;
}

export interface LibraryForUrlDTO {
  user: UserProfileDTO;
  card: UrlCardDTO;
}

export interface GetLibrariesForUrlResult {
  libraries: LibraryForUrlDTO[];
  pagination: PaginationDTO;
  sorting: CardSortingDTO;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetLibrariesForUrlUseCase
  implements UseCase<GetLibrariesForUrlQuery, Result<GetLibrariesForUrlResult>>
{
  constructor(
    private cardQueryRepo: ICardQueryRepository,
    private profileService: IProfileService,
  ) {}

  async execute(
    query: GetLibrariesForUrlQuery,
  ): Promise<Result<GetLibrariesForUrlResult>> {
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
    const sortBy = query.sortBy || CardSortField.CREATED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;

    try {
      // Execute query to get libraries with full card data
      const result = await this.cardQueryRepo.getLibrariesForUrl(
        urlResult.value.value,
        {
          page,
          limit,
          sortBy,
          sortOrder,
        },
      );

      // Enrich with user profiles using ProfileEnricher
      const uniqueUserIds = Array.from(
        new Set(result.items.map((item) => item.userId)),
      );

      const profileEnricher = new ProfileEnricher(this.profileService);
      const profileMapResult = await profileEnricher.buildProfileMap(
        uniqueUserIds,
        query.callingUserId,
        {
          skipFailures: false, // Fail if any profile fetch fails (preserving original behavior)
          mapToUser: false, // Use inline profile (without isFollowing)
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

      // Map items with enriched user data and card data
      const enrichedLibraries: LibraryForUrlDTO[] = result.items.map((item) => {
        const user = profileMap.get(item.userId);
        if (!user) {
          throw new Error(`Profile not found for user ${item.userId}`);
        }

        // Build card object
        // Note: userId is the card author (it's their card in their library)
        const card: UrlCardDTO = {
          id: item.card.id,
          type: 'URL',
          url: item.card.url,
          uri: item.card.uri,
          cardContent: {
            url: item.card.cardContent.url,
            title: item.card.cardContent.title,
            description: item.card.cardContent.description,
            author: item.card.cardContent.author,
            publishedDate: item.card.cardContent.publishedDate?.toISOString(),
            siteName: item.card.cardContent.siteName,
            imageUrl: item.card.cardContent.imageUrl,
            type: item.card.cardContent.type,
            retrievedAt: item.card.cardContent.retrievedAt?.toISOString(),
            doi: item.card.cardContent.doi,
            isbn: item.card.cardContent.isbn,
          },
          libraryCount: item.card.libraryCount,
          urlLibraryCount: item.card.urlLibraryCount,
          urlInLibrary: item.card.urlInLibrary,
          createdAt: item.card.createdAt.toISOString(),
          updatedAt: item.card.updatedAt.toISOString(),
          author: user, // Card author is same as library user
          note: item.card.note,
        };

        return {
          user,
          card,
        };
      });

      return ok({
        libraries: enrichedLibraries,
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
          `Failed to retrieve libraries for URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
