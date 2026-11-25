import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import {
  ICardQueryRepository,
  CardSortField,
  SortOrder,
  AnnotationView,
} from '../../../domain/ICardQueryRepository';
import { URL } from '../../../domain/value-objects/URL';

export interface GetAnnotationsForUrlQuery {
  url: string;
  callingUserId?: string;
  page?: number;
  limit?: number;
  sortBy?: CardSortField;
  sortOrder?: SortOrder;
}

// A passage-level view — one entry per unique annotation (url + normalized
// exact text), carrying a capped notes-first preview of the passage's cards
export type AnnotationViewDTO = Omit<
  AnnotationView,
  'createdAt' | 'updatedAt' | 'annotationCards'
> & {
  createdAt: string;
  updatedAt: string;
  annotationCards: {
    cardId: string;
    userId: string;
    note?: string;
    createdAt: string;
  }[];
};

export interface GetAnnotationsForUrlResult {
  annotations: AnnotationViewDTO[];
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
  constructor(private cardQueryRepo: ICardQueryRepository) {}

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

      return ok({
        annotations: result.items.map((view) => ({
          ...view,
          createdAt: view.createdAt.toISOString(),
          updatedAt: view.updatedAt.toISOString(),
          annotationCards: view.annotationCards.map((entry) => ({
            ...entry,
            createdAt: entry.createdAt.toISOString(),
          })),
        })),
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
