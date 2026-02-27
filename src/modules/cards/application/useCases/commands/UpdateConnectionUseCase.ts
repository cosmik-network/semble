import { Result, ok, err } from '../../../../../shared/core/Result';
import { UseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IConnectionRepository } from '../../../domain/IConnectionRepository';
import { ConnectionId } from '../../../domain/value-objects/ConnectionId';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { PublishedRecordId } from '../../../domain/value-objects/PublishedRecordId';
import { IConnectionPublisher } from '../../ports/IConnectionPublisher';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';
import { ConnectionNote } from '../../../domain/value-objects/ConnectionNote';

export interface UpdateConnectionDTO {
  connectionId: string;
  note?: string;
  removeNote?: boolean;
  curatorId: string;
  publishedRecordId?: PublishedRecordId; // For firehose events - skip republishing if provided
}

export interface UpdateConnectionResponseDTO {
  connectionId: string;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class UpdateConnectionUseCase
  implements
    UseCase<
      UpdateConnectionDTO,
      Result<
        UpdateConnectionResponseDTO,
        ValidationError | AuthenticationError | AppError.UnexpectedError
      >
    >
{
  constructor(
    private connectionRepository: IConnectionRepository,
    private connectionPublisher: IConnectionPublisher,
  ) {}

  async execute(
    request: UpdateConnectionDTO,
  ): Promise<
    Result<
      UpdateConnectionResponseDTO,
      ValidationError | AuthenticationError | AppError.UnexpectedError
    >
  > {
    try {
      // Validate and create CuratorId
      const curatorIdResult = CuratorId.create(request.curatorId);
      if (curatorIdResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid curator ID: ${curatorIdResult.error.message}`,
          ),
        );
      }
      const curatorId = curatorIdResult.value;

      // Validate and create ConnectionId
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
      const connectionId = connectionIdResult.value;

      // Find the connection
      const connectionResult =
        await this.connectionRepository.findById(connectionId);
      if (connectionResult.isErr()) {
        return err(AppError.UnexpectedError.create(connectionResult.error));
      }

      const connection = connectionResult.value;
      if (!connection) {
        return err(
          new ValidationError(`Connection not found: ${request.connectionId}`),
        );
      }

      // Check if user is the curator
      if (!connection.curatorId.equals(curatorId)) {
        return err(
          new ValidationError(
            'Only the connection curator can update the connection',
          ),
        );
      }

      // Handle note update/removal
      if (request.removeNote) {
        const removeResult = connection.removeNote();
        if (removeResult.isErr()) {
          return err(new ValidationError(removeResult.error.message));
        }
      } else if (request.note !== undefined) {
        const noteResult = ConnectionNote.create(request.note);
        if (noteResult.isErr()) {
          return err(
            new ValidationError(`Invalid note: ${noteResult.error.message}`),
          );
        }
        const updateResult = connection.updateNote(noteResult.value);
        if (updateResult.isErr()) {
          return err(new ValidationError(updateResult.error.message));
        }
      }

      // Handle republishing - skip if publishedRecordId provided (firehose event)
      if (request.publishedRecordId) {
        // Update published record ID with provided value
        connection.markAsPublished(request.publishedRecordId);

        // Save connection with updated published record ID
        const saveUpdatedResult =
          await this.connectionRepository.save(connection);
        if (saveUpdatedResult.isErr()) {
          return err(AppError.UnexpectedError.create(saveUpdatedResult.error));
        }
      } else if (connection.isPublished) {
        // Republish connection normally
        const republishResult =
          await this.connectionPublisher.publish(connection);
        if (republishResult.isErr()) {
          // Propagate authentication errors
          if (republishResult.error instanceof AuthenticationError) {
            return err(republishResult.error);
          }
          return err(
            new ValidationError(
              `Failed to republish connection: ${republishResult.error.message}`,
            ),
          );
        }

        // Update published record ID
        connection.markAsPublished(republishResult.value);

        // Save connection with updated published record ID
        const saveUpdatedResult =
          await this.connectionRepository.save(connection);
        if (saveUpdatedResult.isErr()) {
          return err(AppError.UnexpectedError.create(saveUpdatedResult.error));
        }
      }

      return ok({
        connectionId: connection.connectionId.getStringValue(),
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
