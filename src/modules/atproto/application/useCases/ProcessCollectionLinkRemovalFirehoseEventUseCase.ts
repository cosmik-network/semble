import { Result, ok, err } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { AppError } from 'src/shared/core/AppError';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';
import { ATUri } from '../../domain/ATUri';
import { Record as CollectionLinkRemovalRecord } from '../../infrastructure/lexicon/types/network/cosmik/collectionLinkRemoval';
import {
  UpdateUrlCardAssociationsUseCase,
  OperationContext,
} from '../../../cards/application/useCases/commands/UpdateUrlCardAssociationsUseCase';

export interface ProcessCollectionLinkRemovalFirehoseEventDTO {
  atUri: string;
  cid: string | null;
  eventType: 'create' | 'update' | 'delete';
  record?: CollectionLinkRemovalRecord;
}

const ENABLE_FIREHOSE_LOGGING = true;

export class ProcessCollectionLinkRemovalFirehoseEventUseCase
  implements
    UseCase<ProcessCollectionLinkRemovalFirehoseEventDTO, Result<void>>
{
  constructor(
    private atUriResolutionService: IAtUriResolutionService,
    private updateUrlCardAssociationsUseCase: UpdateUrlCardAssociationsUseCase,
  ) {}

  async execute(
    request: ProcessCollectionLinkRemovalFirehoseEventDTO,
  ): Promise<Result<void>> {
    try {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Processing collection link removal event: ${request.atUri} (${request.eventType})`,
        );
      }

      switch (request.eventType) {
        case 'create':
          return await this.handleCollectionLinkRemovalCreate(request);
        case 'delete':
          // For now, we don't handle deletion events for collectionLinkRemoval
          if (ENABLE_FIREHOSE_LOGGING) {
            console.log(
              `[FirehoseWorker] Collection link removal delete event (not handled): ${request.atUri}`,
            );
          }
          break;
        case 'update':
          // Collection link removals don't typically have update operations
          if (ENABLE_FIREHOSE_LOGGING) {
            console.log(
              `[FirehoseWorker] Collection link removal update event (unusual): ${request.atUri}`,
            );
          }
          break;
      }

      return ok(undefined);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  private async handleCollectionLinkRemovalCreate(
    request: ProcessCollectionLinkRemovalFirehoseEventDTO,
  ): Promise<Result<void>> {
    if (!request.record || !request.cid) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.warn(
          `[FirehoseWorker] Collection link removal create event missing record or cid, skipping: ${request.atUri}`,
        );
      }
      return ok(undefined);
    }

    try {
      // Parse AT URI to extract curator DID (the person who published the removal)
      const atUriResult = ATUri.create(request.atUri);
      if (atUriResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Invalid AT URI format: ${request.atUri} - ${atUriResult.error.message}`,
          );
        }
        return ok(undefined);
      }
      const removerDid = atUriResult.value.did.value;

      // Resolve the collection link that's being removed
      const collectionLinkUri = request.record.removedLink.uri;
      const linkInfoResult =
        await this.atUriResolutionService.resolveCollectionLinkId(
          collectionLinkUri,
        );

      if (linkInfoResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to resolve collection link - remover: ${removerDid}, collectionLinkUri: ${collectionLinkUri}, removalUri: ${request.atUri}`,
          );
        }
        return ok(undefined);
      }

      if (!linkInfoResult.value) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Collection link not found in our system (may have already been removed) - remover: ${removerDid}, collectionLinkUri: ${collectionLinkUri}, removalUri: ${request.atUri}`,
          );
        }
        return ok(undefined);
      }

      const { cardId, collectionId } = linkInfoResult.value;

      // Remove the card from the collection using the context flag to skip publishing
      const result = await this.updateUrlCardAssociationsUseCase.execute({
        cardId: cardId.getStringValue(),
        curatorId: removerDid,
        removeFromCollections: [collectionId.getStringValue()],
        context: OperationContext.FIREHOSE_EVENT, // This tells the use case to skip publishing
      });

      if (result.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to remove card from collection - remover: ${removerDid}, cardId: ${cardId.getStringValue()}, collectionId: ${collectionId.getStringValue()}, removalUri: ${request.atUri}, error: ${result.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Successfully removed card from collection via removal record - remover: ${removerDid}, cardId: ${cardId.getStringValue()}, collectionId: ${collectionId.getStringValue()}, removalUri: ${request.atUri}`,
        );
      }
      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing collection link removal create event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined); // Don't fail the firehose processing
    }
  }
}
