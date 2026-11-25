import { Result, ok, err } from '../../../../../shared/core/Result';
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';
import { IConnectionRepository } from '../../../domain/IConnectionRepository';
import { ICardRepository } from '../../../domain/ICardRepository';
import type { Card } from '../../../domain/Card';
import { Connection } from '../../../domain/Connection';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { CardId } from '../../../domain/value-objects/CardId';
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
import { IMetadataService } from '../../../domain/services/IMetadataService';
import { URL } from '../../../domain/value-objects/URL';
import { UrlMetadata } from '../../../domain/value-objects/UrlMetadata';

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
    private cardRepository: ICardRepository,
    private connectionPublisher: IConnectionPublisher,
    private metadataService: IMetadataService,
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

      // Create source UrlOrCardId - validates and normalizes URLs automatically
      const sourceResult = UrlOrCardId.reconstruct(
        request.sourceType,
        request.sourceValue,
      );
      if (sourceResult.isErr()) {
        return err(
          new ValidationError(`Invalid source: ${sourceResult.error.message}`),
        );
      }
      const source = sourceResult.value;

      // Create target UrlOrCardId - validates and normalizes URLs automatically
      const targetResult = UrlOrCardId.reconstruct(
        request.targetType,
        request.targetValue,
      );
      if (targetResult.isErr()) {
        return err(
          new ValidationError(`Invalid target: ${targetResult.error.message}`),
        );
      }
      const target = targetResult.value;

      // CARD endpoints must reference an existing card. Only enforced for
      // user-initiated creates: firehose-mirrored records (publishedRecordId
      // set) can legitimately arrive before the referenced card's record.
      // The resolved cards also anchor the endpoints' URL metadata below.
      let sourceCard: Card | null = null;
      let targetCard: Card | null = null;
      if (!request.publishedRecordId) {
        const cardEndpoints: Array<{
          role: 'source' | 'target';
          cardId: CardId;
        }> = [];
        if (source.isCard && source.cardId) {
          cardEndpoints.push({ role: 'source', cardId: source.cardId });
        }
        if (target.isCard && target.cardId) {
          cardEndpoints.push({ role: 'target', cardId: target.cardId });
        }

        for (const { role, cardId } of cardEndpoints) {
          const cardResult = await this.cardRepository.findById(cardId);
          if (cardResult.isErr()) {
            return err(AppError.UnexpectedError.create(cardResult.error));
          }
          if (!cardResult.value) {
            return err(
              new ValidationError(
                `${role === 'source' ? 'Source' : 'Target'} card not found: ${cardId.getStringValue()}`,
              ),
            );
          }
          if (role === 'source') {
            sourceCard = cardResult.value;
          } else {
            targetCard = cardResult.value;
          }
        }
      } else {
        // Firehose: best-effort anchor resolution — the referenced card's
        // record may not have arrived yet, in which case the endpoint just
        // carries no metadata
        const resolveCard = async (cardId: CardId): Promise<Card | null> => {
          const cardResult = await this.cardRepository.findById(cardId);
          return cardResult.isOk() ? cardResult.value : null;
        };
        if (source.isCard && source.cardId) {
          sourceCard = await resolveCard(source.cardId);
        }
        if (target.isCard && target.cardId) {
          targetCard = await resolveCard(target.cardId);
        }
      }

      // Create connection type - defaults to RELATED when not provided
      const typeResult = request.connectionType
        ? ConnectionType.createFromString(request.connectionType)
        : ConnectionType.create(ConnectionTypeEnum.RELATED);
      if (typeResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid connection type: ${typeResult.error.message}`,
          ),
        );
      }
      const connectionType = typeResult.value;

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

      // Deduplicate only fully identical connections. Identity is
      // (curator, source, target, type, note) - every field included. If any
      // one of them differs, the caller is asserting something different and
      // gets a new connection.
      //
      // Because the match is exact, there is nothing to merge: the existing
      // connection already holds precisely these values, so this is a no-op
      // that returns the existing id.
      //
      // Firehose events are exempt: each AT Protocol record is a distinct
      // entity with its own URI, so collapsing two records into one local row
      // would orphan one of them.
      if (!request.publishedRecordId) {
        const existingResult =
          await this.connectionRepository.findByCuratorIdenticalConnection(
            curatorId,
            source,
            target,
            connectionType,
            note,
          );
        if (existingResult.isErr()) {
          return err(AppError.UnexpectedError.create(existingResult.error));
        }

        const existing = existingResult.value;
        if (existing) {
          return ok({
            connectionId: existing.connectionId.getStringValue(),
          });
        }
      }

      // Fetch URL metadata for both endpoints: a URL endpoint for its own
      // URL, a CARD endpoint (an annotation card) for its anchor URL — so a
      // URL↔card connection carries metadata on both sides, like URL↔URL.
      // Interactive saves use fast mode (the metadata worker enriches
      // asynchronously after ConnectionCreatedEvent); firehose-mirrored
      // records (publishedRecordId set) have no user waiting and take the
      // full slow fetch up front.
      const fetchMode = request.publishedRecordId ? 'slow' : 'fast';
      let sourceUrlMetadata: UrlMetadata | undefined;
      let targetUrlMetadata: UrlMetadata | undefined;

      const sourceEndpointUrl =
        source.type === UrlOrCardIdType.URL ? source.url : sourceCard?.url;
      const targetEndpointUrl =
        target.type === UrlOrCardIdType.URL ? target.url : targetCard?.url;

      const metadataFetches: Promise<{
        type: 'source' | 'target';
        metadata: UrlMetadata | undefined;
      }>[] = [];

      // Fetch source metadata for its URL — its own, or its card's anchor
      if (sourceEndpointUrl) {
        metadataFetches.push(
          this.metadataService
            .fetchMetadata(sourceEndpointUrl, true, fetchMode)
            .then((result) => ({
              type: 'source' as const,
              metadata: result.isOk() ? result.value : undefined,
            }))
            .catch(() => ({
              type: 'source' as const,
              metadata: undefined,
            })),
        );
      }

      // Fetch target metadata for its URL — its own, or its card's anchor
      if (targetEndpointUrl) {
        metadataFetches.push(
          this.metadataService
            .fetchMetadata(targetEndpointUrl, true, fetchMode)
            .then((result) => ({
              type: 'target' as const,
              metadata: result.isOk() ? result.value : undefined,
            }))
            .catch(() => ({
              type: 'target' as const,
              metadata: undefined,
            })),
        );
      }

      // Wait for all metadata fetches to complete
      if (metadataFetches.length > 0) {
        const metadataResults = await Promise.all(metadataFetches);
        for (const result of metadataResults) {
          if (result.type === 'source') {
            sourceUrlMetadata = result.metadata;
          } else {
            targetUrlMetadata = result.metadata;
          }
        }
      }

      // Create connection
      const timestamp = request.createdAt ?? new Date();
      const connectionResult = Connection.create({
        source,
        target,
        sourceUrlMetadata,
        targetUrlMetadata,
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
      const publishEventsResult =
        await this.publishEventsForAggregate(connection);
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
