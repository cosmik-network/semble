import { Result, ok, err } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { AppError } from 'src/shared/core/AppError';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';
import { ATUri } from '../../domain/ATUri';
import { Record as MarginCollectionItemRecord } from '../../infrastructure/lexicon/types/at/margin/collectionItem';
import {
  UpdateUrlCardAssociationsUseCase,
  OperationContext,
} from '../../../cards/application/useCases/commands/UpdateUrlCardAssociationsUseCase';

export interface ProcessMarginCollectionItemFirehoseEventDTO {
  atUri: string;
  cid: string | null;
  eventType: 'create' | 'update' | 'delete';
  record?: MarginCollectionItemRecord;
}

const ENABLE_FIREHOSE_LOGGING = true;

export class ProcessMarginCollectionItemFirehoseEventUseCase
  implements UseCase<ProcessMarginCollectionItemFirehoseEventDTO, Result<void>>
{
  constructor(
    private atUriResolutionService: IAtUriResolutionService,
    private updateUrlCardAssociationsUseCase: UpdateUrlCardAssociationsUseCase,
  ) {}

  async execute(
    request: ProcessMarginCollectionItemFirehoseEventDTO,
  ): Promise<Result<void>> {
    try {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Processing Margin collection item event: ${request.atUri} (${request.eventType})`,
        );
      }

      switch (request.eventType) {
        case 'create':
          return await this.handleCollectionItemCreate(request);
        case 'delete':
          return await this.handleCollectionItemDelete(request);
        case 'update':
          // Margin collection items don't typically have update operations
          if (ENABLE_FIREHOSE_LOGGING) {
            console.log(
              `[FirehoseWorker] Margin collection item update event (unusual): ${request.atUri}`,
            );
          }
          break;
      }

      return ok(undefined);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  private async handleCollectionItemCreate(
    request: ProcessMarginCollectionItemFirehoseEventDTO,
  ): Promise<Result<void>> {
    if (!request.record || !request.cid) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.warn(
          `[FirehoseWorker] Margin collection item create event missing record or cid, skipping: ${request.atUri}`,
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

      // Parse the annotation AT URI to check if it's a bookmark
      // We only support at.margin.bookmark for now (not highlight or annotation)
      const annotationUriResult = ATUri.create(request.record.annotation);
      if (annotationUriResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Invalid annotation AT URI format: ${request.record.annotation} - ${annotationUriResult.error.message}`,
          );
        }
        return ok(undefined);
      }

      const annotationCollection = annotationUriResult.value.collection;
      if (annotationCollection !== 'at.margin.bookmark') {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Ignoring Margin collection item for non-bookmark annotation type: ${annotationCollection}, itemUri: ${request.atUri}`,
          );
        }
        return ok(undefined);
      }

      // Resolve collection and annotation (card) from AT URIs
      // Note: Margin uses string URIs, not StrongRefs like Cosmik
      const collectionId =
        await this.atUriResolutionService.resolveCollectionId(
          request.record.collection,
        );
      const cardId = await this.atUriResolutionService.resolveCardId(
        request.record.annotation,
      );

      if (collectionId.isErr() || !collectionId.value) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to resolve Margin collection - user: ${curatorDid}, collectionUri: ${request.record.collection}, itemUri: ${request.atUri}`,
          );
        }
        return ok(undefined);
      }

      if (cardId.isErr() || !cardId.value) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to resolve Margin annotation (card) - user: ${curatorDid}, annotationUri: ${request.record.annotation}, itemUri: ${request.atUri}`,
          );
        }
        return ok(undefined);
      }

      const publishedRecordId = PublishedRecordId.create({
        uri: request.atUri,
        cid: request.cid,
      });

      const collectionLinkMap = new Map<string, PublishedRecordId>();
      collectionLinkMap.set(
        collectionId.value.getStringValue(),
        publishedRecordId,
      );

      // Note: Margin collection items have a 'position' field which we're ignoring for now
      const result = await this.updateUrlCardAssociationsUseCase.execute({
        cardId: cardId.value.getStringValue(),
        curatorId: curatorDid,
        addToCollections: [collectionId.value.getStringValue()],
        context: OperationContext.FIREHOSE_EVENT,
        publishedRecordIds: {
          collectionLinks: collectionLinkMap,
        },
        viaCardId: undefined, // Margin doesn't have 'via' provenance
      });

      if (result.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to add Margin annotation to collection - user: ${curatorDid}, cardId: ${cardId.value.getStringValue()}, collectionId: ${collectionId.value.getStringValue()}, itemUri: ${request.atUri}, error: ${result.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Successfully added Margin annotation to collection - user: ${curatorDid}, cardId: ${cardId.value.getStringValue()}, collectionId: ${collectionId.value.getStringValue()}, itemUri: ${request.atUri}`,
        );
      }
      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing Margin collection item create event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined);
    }
  }

  private async handleCollectionItemDelete(
    request: ProcessMarginCollectionItemFirehoseEventDTO,
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

      // Handle Margin collection item deletion if we have it in our system
      const linkInfoResult =
        await this.atUriResolutionService.resolveCollectionLinkId(
          request.atUri,
        );
      if (linkInfoResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to resolve Margin collection item - user: ${curatorDid}, uri: ${request.atUri}, error: ${linkInfoResult.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (linkInfoResult.value) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Margin collection item deleted externally - user: ${curatorDid}, cardId: ${linkInfoResult.value.cardId.getStringValue()}, collectionId: ${linkInfoResult.value.collectionId.getStringValue()}, uri: ${request.atUri}`,
          );
        }

        const publishedRecordId = PublishedRecordId.create({
          uri: request.atUri,
          cid: request.cid || 'deleted',
        });

        const result = await this.updateUrlCardAssociationsUseCase.execute({
          cardId: linkInfoResult.value.cardId.getStringValue(),
          curatorId: curatorDid,
          removeFromCollections: [
            linkInfoResult.value.collectionId.getStringValue(),
          ],
          context: OperationContext.FIREHOSE_EVENT,
        });

        if (result.isErr()) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.warn(
              `[FirehoseWorker] Failed to remove Margin annotation from collection - user: ${curatorDid}, cardId: ${linkInfoResult.value.cardId.getStringValue()}, collectionId: ${linkInfoResult.value.collectionId.getStringValue()}, uri: ${request.atUri}, error: ${result.error.message}`,
            );
          }
          return ok(undefined);
        }

        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Successfully removed Margin annotation from collection - user: ${curatorDid}, cardId: ${linkInfoResult.value.cardId.getStringValue()}, collectionId: ${linkInfoResult.value.collectionId.getStringValue()}, uri: ${request.atUri}`,
          );
        }
      }

      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing Margin collection item delete event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined);
    }
  }
}
