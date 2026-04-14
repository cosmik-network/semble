import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { URL } from '../../../../cards/domain/value-objects/URL';
import { SearchService } from '../../../domain/services/SearchService';

export interface IndexUrlForSearchDTO {
  url: string;
}

export interface IndexUrlForSearchResponseDTO {
  indexed: boolean;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class IndexUrlForSearchUseCase
  implements
    UseCase<
      IndexUrlForSearchDTO,
      Result<
        IndexUrlForSearchResponseDTO,
        ValidationError | AppError.UnexpectedError
      >
    >
{
  constructor(private searchService: SearchService) {}

  async execute(
    request: IndexUrlForSearchDTO,
  ): Promise<
    Result<
      IndexUrlForSearchResponseDTO,
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

      // Index the URL
      const indexResult = await this.searchService.indexUrl(urlResult.value);
      if (indexResult.isErr()) {
        return err(
          new ValidationError(
            `Failed to index URL: ${indexResult.error.message}`,
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
