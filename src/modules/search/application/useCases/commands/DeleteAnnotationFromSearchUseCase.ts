import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { URL } from '../../../../cards/domain/value-objects/URL';
import { SearchService } from '../../../domain/services/SearchService';
import { ICardQueryRepository } from '../../../../cards/domain/ICardQueryRepository';

export interface DeleteAnnotationFromSearchDTO {
  url: string;
  exactNormalized: string;
}

export interface DeleteAnnotationFromSearchResponseDTO {
  deleted: boolean;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class DeleteAnnotationFromSearchUseCase implements UseCase<
  DeleteAnnotationFromSearchDTO,
  Result<
    DeleteAnnotationFromSearchResponseDTO,
    ValidationError | AppError.UnexpectedError
  >
> {
  constructor(
    private searchService: SearchService,
    private cardQueryRepository: ICardQueryRepository,
  ) {}

  async execute(
    request: DeleteAnnotationFromSearchDTO,
  ): Promise<
    Result<
      DeleteAnnotationFromSearchResponseDTO,
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

      // The vector is passage-shared across every card that annotates it —
      // only delete it when no other annotation card remains for the passage
      const matchingIds =
        await this.cardQueryRepository.getMatchingAnnotationCardIds(
          urlResult.value.value,
          request.exactNormalized,
        );
      if (matchingIds.length > 0) {
        return ok({ deleted: false });
      }

      const deleteResult = await this.searchService.deleteAnnotation(
        urlResult.value,
        request.exactNormalized,
      );
      if (deleteResult.isErr()) {
        return err(
          new ValidationError(
            `Failed to delete annotation: ${deleteResult.error.message}`,
          ),
        );
      }

      return ok({ deleted: true });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
