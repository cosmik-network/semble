import { Result, ok, err } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { UseCaseError } from 'src/shared/core/UseCaseError';
import { AppError } from 'src/shared/core/AppError';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';
import { ATUri } from '../../domain/ATUri';
import { Record as CollectionRecord } from '../../infrastructure/lexicon/types/network/cosmik/collection';
import { CreateCollectionUseCase } from '../../../cards/application/useCases/commands/CreateCollectionUseCase';
import { UpdateCollectionUseCase } from '../../../cards/application/useCases/commands/UpdateCollectionUseCase';
import { DeleteCollectionUseCase } from '../../../cards/application/useCases/commands/DeleteCollectionUseCase';

export interface ProcessCollectionFirehoseEventDTO {
  atUri: string;
  cid: string | null;
  eventType: 'create' | 'update' | 'delete';
  record?: CollectionRecord;
}

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
      console.log(
        `Processing collection firehose event: ${request.atUri} (${request.eventType})`,
      );

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
      console.warn('Collection create event missing record or cid, skipping');
      return ok(undefined);
    }

    try {
      // Parse AT URI to extract author DID
      const atUriResult = ATUri.create(request.atUri);
      if (atUriResult.isErr()) {
        console.warn(
          `Invalid AT URI format: ${request.atUri} - ${atUriResult.error.message}`,
        );
        return ok(undefined);
      }
      const authorDid = atUriResult.value.did.value;

      const publishedRecordId = PublishedRecordId.create({
        uri: request.atUri,
        cid: request.cid,
      });

      const result = await this.createCollectionUseCase.execute({
        name: request.record.name,
        description: request.record.description,
        curatorId: authorDid,
        publishedRecordId: publishedRecordId,
      });

      if (result.isErr()) {
        console.warn(`Failed to create collection: ${result.error.message}`);
        return ok(undefined);
      }

      console.log(
        `Successfully created collection from firehose event: ${result.value.collectionId}`,
      );
      return ok(undefined);
    } catch (error) {
      console.error(`Error processing collection create event: ${error}`);
      return ok(undefined); // Don't fail the firehose processing
    }
  }

  private async handleCollectionUpdate(
    request: ProcessCollectionFirehoseEventDTO,
  ): Promise<Result<void>> {
    if (!request.record || !request.cid) {
      console.warn('Collection update event missing record or cid, skipping');
      return ok(undefined);
    }

    try {
      // Parse AT URI to extract author DID
      const atUriResult = ATUri.create(request.atUri);
      if (atUriResult.isErr()) {
        console.warn(
          `Invalid AT URI format: ${request.atUri} - ${atUriResult.error.message}`,
        );
        return ok(undefined);
      }
      const authorDid = atUriResult.value.did.value;

      // Resolve existing collection
      const collectionIdResult =
        await this.atUriResolutionService.resolveCollectionId(request.atUri);
      if (collectionIdResult.isErr()) {
        console.warn(
          `Failed to resolve collection ID for ${request.atUri}: ${collectionIdResult.error.message}`,
        );
        return ok(undefined);
      }

      if (!collectionIdResult.value) {
        console.log(`Collection not found in our system: ${request.atUri}`);
        return ok(undefined);
      }

      const publishedRecordId = PublishedRecordId.create({
        uri: request.atUri,
        cid: request.cid,
      });

      const result = await this.updateCollectionUseCase.execute({
        collectionId: collectionIdResult.value.getStringValue(),
        name: request.record.name,
        description: request.record.description,
        curatorId: authorDid,
        publishedRecordId: publishedRecordId,
      });

      if (result.isErr()) {
        console.warn(`Failed to update collection: ${result.error.message}`);
        return ok(undefined);
      }

      console.log(
        `Successfully updated collection from firehose event: ${result.value.collectionId}`,
      );
      return ok(undefined);
    } catch (error) {
      console.error(`Error processing collection update event: ${error}`);
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
        console.warn(
          `Invalid AT URI format: ${request.atUri} - ${atUriResult.error.message}`,
        );
        return ok(undefined);
      }
      const authorDid = atUriResult.value.did.value;

      const collectionIdResult =
        await this.atUriResolutionService.resolveCollectionId(request.atUri);
      if (collectionIdResult.isErr()) {
        console.warn(
          `Failed to resolve collection ID: ${collectionIdResult.error.message}`,
        );
        return ok(undefined);
      }

      if (collectionIdResult.value) {
        console.log(
          `Collection deleted externally: ${request.atUri}, removing from our system`,
        );

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
          console.warn(`Failed to delete collection: ${result.error.message}`);
          return ok(undefined);
        }

        console.log(
          `Successfully deleted collection: ${result.value.collectionId}`,
        );
      }

      return ok(undefined);
    } catch (error) {
      console.error(`Error processing collection delete event: ${error}`);
      return ok(undefined);
    }
  }
}
