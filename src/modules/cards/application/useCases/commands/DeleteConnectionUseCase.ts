import { Result, ok, err } from '../../../../../shared/core/Result';
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';
import { IConnectionRepository } from '../../../domain/IConnectionRepository';
import { ConnectionId } from '../../../domain/value-objects/ConnectionId';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { PublishedRecordId } from '../../../domain/value-objects/PublishedRecordId';
import { IConnectionPublisher } from '../../ports/IConnectionPublisher';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export interface DeleteConnectionDTO {
  connectionId: string;
  curatorId: string;
  publishedRecordId?: PublishedRecordId; // For firehose events - skip unpublishing if provided
}

export interface DeleteConnectionResponseDTO {
  connectionId: string;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class DeleteConnectionUseCase extends BaseUseCase<
  DeleteConnectionDTO,
  Result<
    DeleteConnectionResponseDTO,
    ValidationError | AuthenticationError | AppError.UnexpectedError
  >
> {
  constructor(
    private connectionRepository: IConnectionRepository,
    private connectionPublisher: IConnectionPublisher,
    eventPublisher: IEventPublisher,
  ) {
    super(eventPublisher);
  }

  async execute(
    request: DeleteConnectionDTO,
  ): Promise<
    Result<
      DeleteConnectionResponseDTO,
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
            'Only the connection curator can delete the connection',
          ),
        );
      }

      // Mark connection for removal (raises ConnectionRemovedEvent)
      const removalResult = connection.markForRemoval();
      if (removalResult.isErr()) {
        return err(new ValidationError(removalResult.error.message));
      }

      // Handle unpublishing - skip if publishedRecordId provided (firehose event)
      if (
        !request.publishedRecordId &&
        connection.isPublished &&
        connection.publishedRecordId
      ) {
        const unpublishResult = await this.connectionPublisher.unpublish(
          connection.publishedRecordId,
        );
        if (unpublishResult.isErr()) {
          // Propagate authentication errors
          if (unpublishResult.error instanceof AuthenticationError) {
            return err(unpublishResult.error);
          }
          return err(
            new ValidationError(
              `Failed to unpublish connection: ${unpublishResult.error.message}`,
            ),
          );
        }
      }

      // Publish domain events (ConnectionRemovedEvent)
      const publishEventsResult = await this.publishEventsForAggregate(
        connection,
      );
      if (publishEventsResult.isErr()) {
        console.error(
          'Failed to publish domain events:',
          publishEventsResult.error,
        );
        // Don't fail the operation
      }

      // Delete connection from repository
      const deleteResult = await this.connectionRepository.delete(connectionId);
      if (deleteResult.isErr()) {
        return err(AppError.UnexpectedError.create(deleteResult.error));
      }

      return ok({
        connectionId: connection.connectionId.getStringValue(),
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
