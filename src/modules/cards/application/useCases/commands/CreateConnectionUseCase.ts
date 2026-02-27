import { Result, ok, err } from '../../../../../shared/core/Result';
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';
import { IConnectionRepository } from '../../../domain/IConnectionRepository';
import { Connection } from '../../../domain/Connection';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { PublishedRecordId } from '../../../domain/value-objects/PublishedRecordId';
import { IConnectionPublisher } from '../../ports/IConnectionPublisher';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';
import {
  UrlOrCardId,
  UrlOrCardIdType,
} from '../../../domain/value-objects/UrlOrCardId';
import {
  ConnectionType,
  ConnectionTypeEnum,
} from '../../../domain/value-objects/ConnectionType';
import { ConnectionNote } from '../../../domain/value-objects/ConnectionNote';

export interface CreateConnectionDTO {
  sourceType: UrlOrCardIdType;
  sourceValue: string;
  targetType: UrlOrCardIdType;
  targetValue: string;
  connectionType?: ConnectionTypeEnum;
  note?: string;
  curatorId: string;
  publishedRecordId?: PublishedRecordId; // For firehose events - skip publishing if provided
  createdAt?: Date; // For firehose events - use historical timestamp from AT Protocol record
}

export interface CreateConnectionResponseDTO {
  connectionId: string;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class CreateConnectionUseCase extends BaseUseCase<
  CreateConnectionDTO,
  Result<
    CreateConnectionResponseDTO,
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
    request: CreateConnectionDTO,
  ): Promise<
    Result<
      CreateConnectionResponseDTO,
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

      // Create source UrlOrCardId
      const sourceResult = UrlOrCardId.reconstruct(
        request.sourceType,
        request.sourceValue,
      );
      if (sourceResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid source: ${sourceResult.error.message}`,
          ),
        );
      }
      const source = sourceResult.value;

      // Create target UrlOrCardId
      const targetResult = UrlOrCardId.reconstruct(
        request.targetType,
        request.targetValue,
      );
      if (targetResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid target: ${targetResult.error.message}`,
          ),
        );
      }
      const target = targetResult.value;

      // Create optional connection type
      let connectionType: ConnectionType | undefined;
      if (request.connectionType) {
        const typeResult = ConnectionType.createFromString(
          request.connectionType,
        );
        if (typeResult.isErr()) {
          return err(
            new ValidationError(
              `Invalid connection type: ${typeResult.error.message}`,
            ),
          );
        }
        connectionType = typeResult.value;
      }

      // Create optional note
      let note: ConnectionNote | undefined;
      if (request.note) {
        const noteResult = ConnectionNote.create(request.note);
        if (noteResult.isErr()) {
          return err(
            new ValidationError(`Invalid note: ${noteResult.error.message}`),
          );
        }
        note = noteResult.value;
      }

      // Create connection
      const timestamp = request.createdAt ?? new Date();
      const connectionResult = Connection.create({
        source,
        target,
        type: connectionType,
        note,
        curatorId,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      if (connectionResult.isErr()) {
        return err(new ValidationError(connectionResult.error.message));
      }

      const connection = connectionResult.value;

      // Handle publishing - skip if publishedRecordId provided (firehose event)
      if (request.publishedRecordId) {
        // Mark connection as published with provided record ID
        connection.markAsPublished(request.publishedRecordId);
      } else {
        // Publish connection normally
        const publishResult =
          await this.connectionPublisher.publish(connection);
        if (publishResult.isErr()) {
          // Propagate authentication errors
          if (publishResult.error instanceof AuthenticationError) {
            return err(publishResult.error);
          }
          return err(
            new ValidationError(
              `Failed to publish connection: ${publishResult.error.message}`,
            ),
          );
        }

        // Mark connection as published
        connection.markAsPublished(publishResult.value);
      }

      // Save updated connection with published record ID
      const saveUpdatedResult =
        await this.connectionRepository.save(connection);
      if (saveUpdatedResult.isErr()) {
        return err(AppError.UnexpectedError.create(saveUpdatedResult.error));
      }

      // Publish domain events (ConnectionCreatedEvent)
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

      return ok({
        connectionId: connection.connectionId.getStringValue(),
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
