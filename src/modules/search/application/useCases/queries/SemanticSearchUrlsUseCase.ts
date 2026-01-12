import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { SearchService } from '../../../domain/services/SearchService';
import { SemanticSearchUrlsParams } from '@semble/types/api/requests';
import { UrlView } from '@semble/types/api/responses';
import { Pagination } from '@semble/types/api/common';
import { UrlType } from '../../../../cards/domain/value-objects/UrlType';

export interface SemanticSearchUrlsQuery extends SemanticSearchUrlsParams {
  callingUserId?: string;
}

export interface SemanticSearchUrlsResult {
  urls: UrlView[];
  pagination: Pagination;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class SemanticSearchUrlsUseCase
  implements
    UseCase<
      SemanticSearchUrlsQuery,
      Result<
        SemanticSearchUrlsResult,
        ValidationError | AppError.UnexpectedError
      >
    >
{
  constructor(private searchService: SearchService) {}

  async execute(
    query: SemanticSearchUrlsQuery,
  ): Promise<
    Result<
      SemanticSearchUrlsResult,
      ValidationError | AppError.UnexpectedError
    >
  > {
    try {
      // Set defaults
      const page = query.page || 1;
      const limit = Math.min(query.limit || 20, 100); // Cap at 100
      const threshold = query.threshold || 0.3;

      // Validate query
      if (!query.query || query.query.trim().length === 0) {
        return err(new ValidationError('Query parameter is required'));
      }

      // Parse urlType if provided
      let urlType: UrlType | undefined;
      if (query.urlType) {
        // Validate that the urlType is a valid enum value
        if (Object.values(UrlType).includes(query.urlType as UrlType)) {
          urlType = query.urlType as UrlType;
        } else {
          return err(new ValidationError(`Invalid URL type: ${query.urlType}`));
        }
      }

      // Always get 50 results from vector database
      const vectorDbLimit = 50;
      const searchResult = await this.searchService.semanticSearchUrls(
        query.query.trim(),
        {
          limit: vectorDbLimit,
          threshold,
          urlType,
          callingUserId: query.callingUserId,
        },
      );

      if (searchResult.isErr()) {
        return err(
          new ValidationError(
            `Failed to search URLs: ${searchResult.error.message}`,
          ),
        );
      }

      const allUrls = searchResult.value;
      const totalAvailable = allUrls.length; // This is max 50

      // Apply pagination to the 50 results
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUrls = allUrls.slice(startIndex, endIndex);

      // Calculate pagination info based on the 50 results we have
      const totalPages = Math.ceil(totalAvailable / limit);
      const hasMore = endIndex < totalAvailable;

      return ok({
        urls: paginatedUrls,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: totalAvailable, // This will be max 50
          hasMore,
          limit,
        },
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
