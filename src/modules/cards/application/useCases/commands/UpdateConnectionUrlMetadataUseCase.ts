import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IConnectionRepository } from '../../../domain/IConnectionRepository';
import { ConnectionId } from '../../../domain/value-objects/ConnectionId';
import { UrlMetadata } from '../../../domain/value-objects/UrlMetadata';

export interface UpdateConnectionUrlMetadataDTO {
  connectionId: string;
  sourceUrlMetadata?: UrlMetadata;
  targetUrlMetadata?: UrlMetadata;
}

export interface UpdateConnectionUrlMetadataResponseDTO {
  connectionId: string;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Replaces a connection's stored source/target URL metadata with enriched
 * versions from the async slow metadata fetch. DB-only: URL metadata is not
 * part of the AT Protocol connection record, so no PDS republish is needed.
 */
export class UpdateConnectionUrlMetadataUseCase implements UseCase<
  UpdateConnectionUrlMetadataDTO,
  Result<
    UpdateConnectionUrlMetadataResponseDTO,
    ValidationError | AppError.UnexpectedError
  >
> {
  constructor(private connectionRepository: IConnectionRepository) {}

  async execute(
    request: UpdateConnectionUrlMetadataDTO,
  ): Promise<
    Result<
      UpdateConnectionUrlMetadataResponseDTO,
      ValidationError | AppError.UnexpectedError
    >
  > {
    try {
      if (!request.sourceUrlMetadata && !request.targetUrlMetadata) {
        return err(new ValidationError('No metadata updates provided'));
      }

      const connectionIdResult = ConnectionId.createFromString(
        request.connectionId,
      );
      if (connectionIdResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid connection ID: ${connectionIdResult.error.message}`,
          ),
        );
      }

      const connectionResult = await this.connectionRepository.findById(
        connectionIdResult.value,
      );
      if (connectionResult.isErr()) {
        return err(AppError.UnexpectedError.create(connectionResult.error));
      }
      const connection = connectionResult.value;
      if (!connection) {
        return err(
          new ValidationError(`Connection not found: ${request.connectionId}`),
        );
      }

      const updateResult = connection.updateUrlMetadata({
        sourceUrlMetadata: request.sourceUrlMetadata,
        targetUrlMetadata: request.targetUrlMetadata,
      });
      if (updateResult.isErr()) {
        return err(new ValidationError(updateResult.error.message));
      }

      const saveResult = await this.connectionRepository.save(connection);
      if (saveResult.isErr()) {
        return err(AppError.UnexpectedError.create(saveResult.error));
      }

      return ok({ connectionId: request.connectionId });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
