import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { URL } from '../../../../cards/domain/value-objects/URL';
import { SearchService } from '../../../domain/services/SearchService';

export interface IndexAnnotationForSearchDTO {
  url: string;
  /** The raw selector.exact — the only embedded content */
  exact: string;
  /** The stored annotation_selectors.exact_normalized value */
  exactNormalized: string;
}

export interface IndexAnnotationForSearchResponseDTO {
  indexed: boolean;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class IndexAnnotationForSearchUseCase implements UseCase<
  IndexAnnotationForSearchDTO,
  Result<
    IndexAnnotationForSearchResponseDTO,
    ValidationError | AppError.UnexpectedError
  >
> {
  constructor(private searchService: SearchService) {}

  async execute(
    request: IndexAnnotationForSearchDTO,
  ): Promise<
    Result<
      IndexAnnotationForSearchResponseDTO,
      ValidationError | AppError.UnexpectedError
    >
  > {
    try {
      // Validate URL
      const urlResult = URL.create(request.url);
      if (urlResult.isErr()) {
        return err(
          new ValidationError(`Invalid URL: ${urlResult.error.message}`),
        );
      }

      // Index the annotation passage (skips silently below min length)
      const indexResult = await this.searchService.indexAnnotation(
        urlResult.value,
        request.exact,
        request.exactNormalized,
      );
      if (indexResult.isErr()) {
        return err(
          new ValidationError(
            `Failed to index annotation: ${indexResult.error.message}`,
          ),
        );
      }

      return ok({
        indexed: true,
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
