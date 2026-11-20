import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import {
  ICardQueryRepository,
  CardSortField,
  SortOrder,
  AnnotationCardView,
} from '../../../domain/ICardQueryRepository';
import { URL } from '../../../domain/value-objects/URL';
import { IProfileService } from '../../../domain/services/IProfileService';
import { User } from '@semble/types';
import { ProfileEnricher } from '../../services/ProfileEnricher';

export interface GetAnnotationsForUrlQuery {
  url: string;
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: CardSortField;
  sortOrder?: SortOrder;
}

// Enriched annotation card — same shape as the annotation variant of
// GetUrlCardsUseCase's CardListItemDTO
export type AnnotationListItemDTO = Omit<AnnotationCardView, 'authorId'> & {
  author: User;
};

export interface GetAnnotationsForUrlResult {
  annotations: AnnotationListItemDTO[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
    limit: number;
  };
  sorting: {
    sortBy: CardSortField;
    sortOrder: SortOrder;
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class GetAnnotationsForUrlUseCase implements UseCase<
  GetAnnotationsForUrlQuery,
  Result<GetAnnotationsForUrlResult>
> {
  constructor(
    private cardQueryRepo: ICardQueryRepository,
    private profileService: IProfileService,
  ) {}

  async execute(
    query: GetAnnotationsForUrlQuery,
  ): Promise<Result<GetAnnotationsForUrlResult>> {
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
    const sortBy = query.sortBy || CardSortField.UPDATED_AT;
    const sortOrder = query.sortOrder || SortOrder.DESC;

    try {
      const result = await this.cardQueryRepo.getAnnotationsForUrl(
        urlResult.value.value,
        {
          page,
          limit,
          sortBy,
          sortOrder,
        },
      );

      // Enrich with author profiles using ProfileEnricher
      const profileEnricher = new ProfileEnricher(this.profileService);
      const enrichResult = await profileEnricher.enrichWithAuthors(
        result.items,
        (item) => item.authorId,
        query.callingUserId,
        { mapToUser: false }, // Use inline profile (without isFollowing)
      );

      if (enrichResult.isErr()) {
        return err(enrichResult.error);
      }

      return ok({
        annotations: enrichResult.value,
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
          `Failed to retrieve annotations for URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
