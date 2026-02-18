import { Result, ok, err } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { AppError } from 'src/shared/core/AppError';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';
import { ATUri } from '../../domain/ATUri';
import { Record as CollectionLinkRecord } from '../../infrastructure/lexicon/types/network/cosmik/collectionLink';
import {
  UpdateUrlCardAssociationsUseCase,
  OperationContext,
} from '../../../cards/application/useCases/commands/UpdateUrlCardAssociationsUseCase';
import { CardId } from 'src/modules/cards/domain/value-objects/CardId';
export interface ProcessCollectionLinkFirehoseEventDTO {
  atUri: string;
  cid: string | null;
  eventType: 'create' | 'update' | 'delete';
  record?: CollectionLinkRecord;
}

const ENABLE_FIREHOSE_LOGGING = true;
export class ProcessCollectionLinkFirehoseEventUseCase
  implements UseCase<ProcessCollectionLinkFirehoseEventDTO, Result<void>>
{
  constructor(
    private atUriResolutionService: IAtUriResolutionService,
    private updateUrlCardAssociationsUseCase: UpdateUrlCardAssociationsUseCase,
  ) {}

  async execute(
    request: ProcessCollectionLinkFirehoseEventDTO,
  ): Promise<Result<void>> {
    try {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Processing collection link event: ${request.atUri} (${request.eventType})`,
        );
      }

      switch (request.eventType) {
        case 'create':
          return await this.handleCollectionLinkCreate(request);
        case 'delete':
          return await this.handleCollectionLinkDelete(request);
        case 'update':
          // Collection links don't typically have update operations
          if (ENABLE_FIREHOSE_LOGGING) {
            console.log(
              `[FirehoseWorker] Collection link update event (unusual): ${request.atUri}`,
            );
          }
          break;
      }

      return ok(undefined);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  private async handleCollectionLinkCreate(
    request: ProcessCollectionLinkFirehoseEventDTO,
  ): Promise<Result<void>> {
    if (!request.record || !request.cid) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.warn(
          `[FirehoseWorker] Collection link create event missing record or cid, skipping: ${request.atUri}`,
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

      // Resolve collection and card from strong refs
      const collectionId =
        await this.atUriResolutionService.resolveCollectionId(
          request.record.collection.uri,
        );
      const cardId = await this.atUriResolutionService.resolveCardId(
        request.record.card.uri,
      );

      if (collectionId.isErr() || !collectionId.value) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to resolve collection - user: ${curatorDid}, collectionUri: ${request.record.collection.uri}, linkUri: ${request.atUri}`,
          );
        }
        return ok(undefined);
      }

      if (cardId.isErr() || !cardId.value) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to resolve card - user: ${curatorDid}, cardUri: ${request.record.card.uri}, linkUri: ${request.atUri}`,
          );
        }
        return ok(undefined);
      }

      // Extract timestamps from AT Protocol record
      // Use createdAt for the published record timestamp
      const recordedAt = request.record.createdAt
        ? new Date(request.record.createdAt)
        : undefined;
      // Use addedAt for the collection link timestamp (when card was added to collection)
      const timestamp = new Date(request.record.addedAt);

      const publishedRecordId = PublishedRecordId.create({
        uri: request.atUri,
        cid: request.cid,
      });

      const collectionLinkMap = new Map<string, PublishedRecordId>();
      collectionLinkMap.set(
        collectionId.value.getStringValue(),
        publishedRecordId,
      );
      let viaCardId: CardId | undefined = undefined;
      const viaAtUri = request.record.provenance?.via?.uri;
      if (viaAtUri) {
        const viaCardIdResult =
          await this.atUriResolutionService.resolveCardId(viaAtUri);
        if (viaCardIdResult.isOk()) {
          viaCardId = viaCardIdResult.value || undefined;
        }
      }

      const result = await this.updateUrlCardAssociationsUseCase.execute({
        cardId: cardId.value.getStringValue(),
        curatorId: curatorDid,
        addToCollections: [collectionId.value.getStringValue()],
        context: OperationContext.FIREHOSE_EVENT,
        publishedRecordIds: {
          collectionLinks: collectionLinkMap,
        },
        viaCardId: viaCardId?.getStringValue(),
        timestamp: timestamp,
      });

      if (result.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to add card to collection - user: ${curatorDid}, cardId: ${cardId.value.getStringValue()}, collectionId: ${collectionId.value.getStringValue()}, linkUri: ${request.atUri}, error: ${result.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Successfully added card to collection - user: ${curatorDid}, cardId: ${cardId.value.getStringValue()}, collectionId: ${collectionId.value.getStringValue()}, linkUri: ${request.atUri}`,
        );
      }
      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing collection link create event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined);
    }
  }

  private async handleCollectionLinkDelete(
    request: ProcessCollectionLinkFirehoseEventDTO,
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

      // Handle collection link deletion if we have it in our system
      const linkInfoResult =
        await this.atUriResolutionService.resolveCollectionLinkId(
          request.atUri,
        );
      if (linkInfoResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to resolve collection link - user: ${curatorDid}, uri: ${request.atUri}, error: ${linkInfoResult.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (linkInfoResult.value) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Collection link deleted externally - user: ${curatorDid}, cardId: ${linkInfoResult.value.cardId.getStringValue()}, collectionId: ${linkInfoResult.value.collectionId.getStringValue()}, uri: ${request.atUri}`,
          );
        }

        // For delete events, we don't have a record, so no timestamp available
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
              `[FirehoseWorker] Failed to remove card from collection - user: ${curatorDid}, cardId: ${linkInfoResult.value.cardId.getStringValue()}, collectionId: ${linkInfoResult.value.collectionId.getStringValue()}, uri: ${request.atUri}, error: ${result.error.message}`,
            );
          }
          return ok(undefined);
        }

        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Successfully removed card from collection - user: ${curatorDid}, cardId: ${linkInfoResult.value.cardId.getStringValue()}, collectionId: ${linkInfoResult.value.collectionId.getStringValue()}, uri: ${request.atUri}`,
          );
        }
      }

      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing collection link delete event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined);
    }
  }
}
