import { Result, ok, err } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { AppError } from 'src/shared/core/AppError';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';
import { ATUri } from '../../domain/ATUri';
import { Record as CollectionRecord } from '../../infrastructure/lexicon/types/network/cosmik/collection';
import { CreateCollectionUseCase } from '../../../cards/application/useCases/commands/CreateCollectionUseCase';
import { UpdateCollectionUseCase } from '../../../cards/application/useCases/commands/UpdateCollectionUseCase';
import { DeleteCollectionUseCase } from '../../../cards/application/useCases/commands/DeleteCollectionUseCase';
import { CollectionAccessType } from '../../../cards/domain/Collection';
export interface ProcessCollectionFirehoseEventDTO {
  atUri: string;
  cid: string | null;
  eventType: 'create' | 'update' | 'delete';
  record?: CollectionRecord;
}
const ENABLE_FIREHOSE_LOGGING = true;

export class ProcessCollectionFirehoseEventUseCase
  implements UseCase<ProcessCollectionFirehoseEventDTO, Result<void>>
{
  constructor(
    private atUriResolutionService: IAtUriResolutionService,
    private createCollectionUseCase: CreateCollectionUseCase,
    private updateCollectionUseCase: UpdateCollectionUseCase,
    private deleteCollectionUseCase: DeleteCollectionUseCase,
  ) {}

  async execute(
    request: ProcessCollectionFirehoseEventDTO,
  ): Promise<Result<void>> {
    try {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Processing collection event: ${request.atUri} (${request.eventType})`,
        );
      }

      switch (request.eventType) {
        case 'create':
          return await this.handleCollectionCreate(request);
        case 'update':
          return await this.handleCollectionUpdate(request);
        case 'delete':
          return await this.handleCollectionDelete(request);
      }

      return ok(undefined);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  private async handleCollectionCreate(
    request: ProcessCollectionFirehoseEventDTO,
  ): Promise<Result<void>> {
    if (!request.record || !request.cid) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.warn(
          `[FirehoseWorker] Collection create event missing record or cid, skipping: ${request.atUri}`,
        );
      }
      return ok(undefined);
    }

    try {
      // Parse AT URI to extract author DID
      const atUriResult = ATUri.create(request.atUri);
      if (atUriResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Invalid AT URI format: ${request.atUri} - ${atUriResult.error.message}`,
          );
        }
        return ok(undefined);
      }
      const authorDid = atUriResult.value.did.value;

      // Extract timestamp from AT Protocol record
      const timestamp = request.record.createdAt
        ? new Date(request.record.createdAt)
        : undefined;

      const publishedRecordId = PublishedRecordId.create({
        uri: request.atUri,
        cid: request.cid,
      });

      const result = await this.createCollectionUseCase.execute({
        name: request.record.name,
        description: request.record.description,
        accessType: request.record.accessType as
          | CollectionAccessType
          | undefined,
        curatorId: authorDid,
        publishedRecordId: publishedRecordId,
        createdAt: timestamp,
      });

      if (result.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to create collection - user: ${authorDid}, uri: ${request.atUri}, error: ${result.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Successfully created collection - user: ${authorDid}, collectionId: ${result.value.collectionId}, uri: ${request.atUri}`,
        );
      }
      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing collection create event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined); // Don't fail the firehose processing
    }
  }

  private async handleCollectionUpdate(
    request: ProcessCollectionFirehoseEventDTO,
  ): Promise<Result<void>> {
    if (!request.record || !request.cid) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.warn(
          `[FirehoseWorker] Collection update event missing record or cid, skipping: ${request.atUri}`,
        );
      }
      return ok(undefined);
    }

    try {
      // Parse AT URI to extract author DID
      const atUriResult = ATUri.create(request.atUri);
      if (atUriResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Invalid AT URI format: ${request.atUri} - ${atUriResult.error.message}`,
          );
        }
        return ok(undefined);
      }
      const authorDid = atUriResult.value.did.value;

      // Resolve existing collection
      const collectionIdResult =
        await this.atUriResolutionService.resolveCollectionId(request.atUri);
      if (collectionIdResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to resolve collection ID - user: ${authorDid}, uri: ${request.atUri}, error: ${collectionIdResult.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (!collectionIdResult.value) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Collection not found in our system - user: ${authorDid}, uri: ${request.atUri}`,
          );
        }
        return ok(undefined);
      }

      // Extract timestamp from AT Protocol record for the published record
      const timestamp = request.record.createdAt
        ? new Date(request.record.createdAt)
        : undefined;

      const publishedRecordId = PublishedRecordId.create({
        uri: request.atUri,
        cid: request.cid,
      });

      const result = await this.updateCollectionUseCase.execute({
        collectionId: collectionIdResult.value.getStringValue(),
        name: request.record.name,
        description: request.record.description,
        accessType: request.record.accessType as
          | CollectionAccessType
          | undefined,
        curatorId: authorDid,
        publishedRecordId: publishedRecordId,
      });

      if (result.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to update collection - user: ${authorDid}, collectionId: ${collectionIdResult.value.getStringValue()}, uri: ${request.atUri}, error: ${result.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Successfully updated collection - user: ${authorDid}, collectionId: ${result.value.collectionId}, uri: ${request.atUri}`,
        );
      }
      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing collection update event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined); // Don't fail the firehose processing
    }
  }

  private async handleCollectionDelete(
    request: ProcessCollectionFirehoseEventDTO,
  ): Promise<Result<void>> {
    try {
      // Parse AT URI to extract author DID
      const atUriResult = ATUri.create(request.atUri);
      if (atUriResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Invalid AT URI format: ${request.atUri} - ${atUriResult.error.message}`,
          );
        }
        return ok(undefined);
      }
      const authorDid = atUriResult.value.did.value;

      const collectionIdResult =
        await this.atUriResolutionService.resolveCollectionId(request.atUri);
      if (collectionIdResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to resolve collection ID - user: ${authorDid}, uri: ${request.atUri}, error: ${collectionIdResult.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (collectionIdResult.value) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Collection deleted externally - user: ${authorDid}, collectionId: ${collectionIdResult.value.getStringValue()}, uri: ${request.atUri}`,
          );
        }

        // For delete events, we don't have a record, so no timestamp available
        const publishedRecordId = PublishedRecordId.create({
          uri: request.atUri,
          cid: request.cid || 'deleted',
        });

        const result = await this.deleteCollectionUseCase.execute({
          collectionId: collectionIdResult.value.getStringValue(),
          curatorId: authorDid,
          publishedRecordId: publishedRecordId,
        });

        if (result.isErr()) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.warn(
              `[FirehoseWorker] Failed to delete collection - user: ${authorDid}, collectionId: ${collectionIdResult.value.getStringValue()}, uri: ${request.atUri}, error: ${result.error.message}`,
            );
          }
          return ok(undefined);
        }

        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Successfully deleted collection - user: ${authorDid}, collectionId: ${result.value.collectionId}, uri: ${request.atUri}`,
          );
        }
      }

      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing collection delete event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined);
    }
  }
}
