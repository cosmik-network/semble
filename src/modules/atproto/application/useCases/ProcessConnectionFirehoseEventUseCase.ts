import { Result, ok, err } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { AppError } from 'src/shared/core/AppError';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';
import { ATUri } from '../../domain/ATUri';
import { Record as ConnectionRecord } from '../../infrastructure/lexicon/types/network/cosmik/connection';
import { CreateConnectionUseCase } from '../../../cards/application/useCases/commands/CreateConnectionUseCase';
import { UpdateConnectionUseCase } from '../../../cards/application/useCases/commands/UpdateConnectionUseCase';
import { DeleteConnectionUseCase } from '../../../cards/application/useCases/commands/DeleteConnectionUseCase';
import { UrlOrCardIdType } from '../../../cards/domain/value-objects/UrlOrCardId';

export interface ProcessConnectionFirehoseEventDTO {
  atUri: string;
  cid: string | null;
  eventType: 'create' | 'update' | 'delete';
  record?: ConnectionRecord;
}

const ENABLE_FIREHOSE_LOGGING = true;

/**
 * Infers the type of a UrlOrCardId from its string value.
 * - If it starts with "at://", it's a CARD (AT URI)
 * - Otherwise, it's a URL
 */
function inferUrlOrCardIdType(value: string): UrlOrCardIdType {
  return value.startsWith('at://') ? UrlOrCardIdType.CARD : UrlOrCardIdType.URL;
}

export class ProcessConnectionFirehoseEventUseCase
  implements UseCase<ProcessConnectionFirehoseEventDTO, Result<void>>
{
  constructor(
    private atUriResolutionService: IAtUriResolutionService,
    private createConnectionUseCase: CreateConnectionUseCase,
    private updateConnectionUseCase: UpdateConnectionUseCase,
    private deleteConnectionUseCase: DeleteConnectionUseCase,
  ) {}

  async execute(
    request: ProcessConnectionFirehoseEventDTO,
  ): Promise<Result<void>> {
    try {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Processing connection event: ${request.atUri} (${request.eventType})`,
        );
      }

      switch (request.eventType) {
        case 'create':
          return await this.handleConnectionCreate(request);
        case 'update':
          return await this.handleConnectionUpdate(request);
        case 'delete':
          return await this.handleConnectionDelete(request);
      }

      return ok(undefined);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  private async handleConnectionCreate(
    request: ProcessConnectionFirehoseEventDTO,
  ): Promise<Result<void>> {
    if (!request.record || !request.cid) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.warn(
          `[FirehoseWorker] Connection create event missing record or cid, skipping: ${request.atUri}`,
        );
      }
      return ok(undefined);
    }

    try {
      // Parse AT URI to extract curator DID
      const atUriResult = ATUri.create(request.atUri);
      if (atUriResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Invalid AT URI format: ${request.atUri} - ${atUriResult.error.message}`,
          );
        }
        return ok(undefined);
      }
      const curatorDid = atUriResult.value.did.value;

      // Extract timestamp from AT Protocol record
      const timestamp = request.record.createdAt
        ? new Date(request.record.createdAt)
        : undefined;

      const publishedRecordId = PublishedRecordId.create({
        uri: request.atUri,
        cid: request.cid,
      });

      // Infer source and target types from their string values
      const sourceType = inferUrlOrCardIdType(request.record.source);
      const targetType = inferUrlOrCardIdType(request.record.target);

      const result = await this.createConnectionUseCase.execute({
        sourceType,
        sourceValue: request.record.source,
        targetType,
        targetValue: request.record.target,
        connectionType: request.record.connectionType as any, // Cast to ConnectionTypeEnum
        note: request.record.note,
        curatorId: curatorDid,
        publishedRecordId: publishedRecordId,
        createdAt: timestamp,
      });

      if (result.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to create connection - curator: ${curatorDid}, uri: ${request.atUri}, error: ${result.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Successfully created connection - curator: ${curatorDid}, connectionId: ${result.value.connectionId}, uri: ${request.atUri}`,
        );
      }
      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing connection create event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined); // Don't fail the firehose processing
    }
  }

  private async handleConnectionUpdate(
    request: ProcessConnectionFirehoseEventDTO,
  ): Promise<Result<void>> {
    if (!request.record || !request.cid) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.warn(
          `[FirehoseWorker] Connection update event missing record or cid, skipping: ${request.atUri}`,
        );
      }
      return ok(undefined);
    }

    try {
      // Parse AT URI to extract curator DID
      const atUriResult = ATUri.create(request.atUri);
      if (atUriResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Invalid AT URI format: ${request.atUri} - ${atUriResult.error.message}`,
          );
        }
        return ok(undefined);
      }
      const curatorDid = atUriResult.value.did.value;

      // Resolve existing connection
      const connectionIdResult =
        await this.atUriResolutionService.resolveConnectionId(request.atUri);
      if (connectionIdResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to resolve connection ID - curator: ${curatorDid}, uri: ${request.atUri}, error: ${connectionIdResult.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (!connectionIdResult.value) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Connection not found in our system - curator: ${curatorDid}, uri: ${request.atUri}`,
          );
        }
        return ok(undefined);
      }

      const publishedRecordId = PublishedRecordId.create({
        uri: request.atUri,
        cid: request.cid,
      });

      // Note: UpdateConnectionDTO only supports updating the note field.
      // Source, target, and connectionType changes are not supported for updates.
      const result = await this.updateConnectionUseCase.execute({
        connectionId: connectionIdResult.value.getStringValue(),
        note: request.record.note,
        curatorId: curatorDid,
        publishedRecordId: publishedRecordId,
      });

      if (result.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to update connection - curator: ${curatorDid}, connectionId: ${connectionIdResult.value.getStringValue()}, uri: ${request.atUri}, error: ${result.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Successfully updated connection - curator: ${curatorDid}, connectionId: ${result.value.connectionId}, uri: ${request.atUri}`,
        );
      }
      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing connection update event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined); // Don't fail the firehose processing
    }
  }

  private async handleConnectionDelete(
    request: ProcessConnectionFirehoseEventDTO,
  ): Promise<Result<void>> {
    try {
      // Parse AT URI to extract curator DID
      const atUriResult = ATUri.create(request.atUri);
      if (atUriResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Invalid AT URI format: ${request.atUri} - ${atUriResult.error.message}`,
          );
        }
        return ok(undefined);
      }
      const curatorDid = atUriResult.value.did.value;

      const connectionIdResult =
        await this.atUriResolutionService.resolveConnectionId(request.atUri);
      if (connectionIdResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to resolve connection ID - curator: ${curatorDid}, uri: ${request.atUri}, error: ${connectionIdResult.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (connectionIdResult.value) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Connection deleted externally - curator: ${curatorDid}, connectionId: ${connectionIdResult.value.getStringValue()}, uri: ${request.atUri}`,
          );
        }

        const publishedRecordId = PublishedRecordId.create({
          uri: request.atUri,
          cid: request.cid || 'deleted',
        });

        const result = await this.deleteConnectionUseCase.execute({
          connectionId: connectionIdResult.value.getStringValue(),
          curatorId: curatorDid,
          publishedRecordId: publishedRecordId,
        });

        if (result.isErr()) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.warn(
              `[FirehoseWorker] Failed to delete connection - curator: ${curatorDid}, connectionId: ${connectionIdResult.value.getStringValue()}, uri: ${request.atUri}, error: ${result.error.message}`,
            );
          }
          return ok(undefined);
        }

        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Successfully deleted connection - curator: ${curatorDid}, connectionId: ${result.value.connectionId}, uri: ${request.atUri}`,
          );
        }
      }

      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing connection delete event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined);
    }
  }
}
