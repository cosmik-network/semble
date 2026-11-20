import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import {
  ICardQueryRepository,
  CardSortField,
  SortOrder,
} from '../../../domain/ICardQueryRepository';
import { URL } from '../../../domain/value-objects/URL';
import { normalizeQuotedText } from '../../../domain/value-objects/selectors/normalizeQuotedText';
import { IProfileService } from '../../../domain/services/IProfileService';
import {
  UserProfileDTO,
  AnnotationCard,
  PaginationDTO,
  CardSortingDTO,
} from '@semble/types';
import { ProfileEnricher } from '../../services/ProfileEnricher';
import { ValidationError } from './GetAnnotationsForUrlUseCase';

export interface GetLibrariesForAnnotationQuery {
  url: string;
  /** Exact text of the annotation's TextQuoteSelector */
  exact: string;
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: CardSortField;
  sortOrder?: SortOrder;
}

export interface LibraryForAnnotationItemDTO {
  user: UserProfileDTO;
  card: AnnotationCard;
}

export interface GetLibrariesForAnnotationResult {
  libraries: LibraryForAnnotationItemDTO[];
  pagination: PaginationDTO;
  sorting: CardSortingDTO;
}

export class GetLibrariesForAnnotationUseCase implements UseCase<
  GetLibrariesForAnnotationQuery,
  Result<GetLibrariesForAnnotationResult>
> {
  constructor(
    private cardQueryRepo: ICardQueryRepository,
    private profileService: IProfileService,
  ) {}

  async execute(
    query: GetLibrariesForAnnotationQuery,
  ): Promise<Result<GetLibrariesForAnnotationResult>> {
    const urlResult = URL.create(query.url);
    if (urlResult.isErr()) {
      return err(
        new ValidationError(`Invalid URL: ${urlResult.error.message}`),
      );
    }

    // Matching key — same normalization the write path stores
    const exactNormalized = normalizeQuotedText(query.exact ?? '');
    if (exactNormalized.length === 0) {
      return err(new ValidationError('exact text is required'));
    }

    // Set defaults
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Cap at 100
    const sortBy = query.sortBy || CardSortField.CREATED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;

    try {
      const result = await this.cardQueryRepo.getLibrariesForAnnotation(
        urlResult.value.value,
        exactNormalized,
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
          skipFailures: true,
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

      // Filter out items with missing profiles
      const enrichedLibraries: LibraryForAnnotationItemDTO[] = result.items
        .map((item) => {
          const user = profileMap.get(item.userId);
          if (!user) {
            return null;
          }

          // Note: userId is the card author (it's their card in their library)
          const card: AnnotationCard = {
            id: item.card.id,
            type: 'ANNOTATION',
            url: item.card.url,
            uri: item.card.uri,
            libraryCount: item.card.libraryCount,
            selectors: item.card.selectors.map((selector) => ({
              type: selector.type as 'TextQuoteSelector',
              exact: selector.exact,
              prefix: selector.prefix,
              suffix: selector.suffix,
            })),
            note: item.card.note,
            createdAt: item.card.createdAt.toISOString(),
            updatedAt: item.card.updatedAt.toISOString(),
            author: user,
          };

          return {
            user,
            card,
          };
        })
        .filter(
          (library): library is LibraryForAnnotationItemDTO => library !== null,
        );

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
          `Failed to retrieve libraries for annotation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
