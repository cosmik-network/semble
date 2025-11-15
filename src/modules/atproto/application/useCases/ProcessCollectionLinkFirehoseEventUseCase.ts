import { Result, ok, err } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { UseCaseError } from 'src/shared/core/UseCaseError';
import { AppError } from 'src/shared/core/AppError';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';
import { ATUri } from '../../domain/ATUri';
import { Record as CollectionLinkRecord } from '../../infrastructure/lexicon/types/network/cosmik/collectionLink';
import {
  UpdateUrlCardAssociationsUseCase,
  OperationContext,
} from '../../../cards/application/useCases/commands/UpdateUrlCardAssociationsUseCase';

export interface ProcessCollectionLinkFirehoseEventDTO {
  atUri: string;
  cid: string | null;
  eventType: 'create' | 'update' | 'delete';
  record?: CollectionLinkRecord;
}

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
      console.log(
        `Processing collection link firehose event: ${request.atUri} (${request.eventType})`,
      );

      switch (request.eventType) {
        case 'create':
          return await this.handleCollectionLinkCreate(request);
        case 'delete':
          return await this.handleCollectionLinkDelete(request);
        case 'update':
          // Collection links don't typically have update operations
          console.log(
            `Collection link update event for ${request.atUri} (unusual)`,
          );
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
      console.warn(
        'Collection link create event missing record or cid, skipping',
      );
      return ok(undefined);
    }

    try {
      // Parse AT URI to extract curator DID
      const atUriResult = ATUri.create(request.atUri);
      if (atUriResult.isErr()) {
        console.warn(
          `Invalid AT URI format: ${request.atUri} - ${atUriResult.error.message}`,
        );
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
        console.warn(
          `Failed to resolve collection: ${request.record.collection.uri}`,
        );
        return ok(undefined);
      }

      if (cardId.isErr() || !cardId.value) {
        console.warn(`Failed to resolve card: ${request.record.card.uri}`);
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

      const result = await this.updateUrlCardAssociationsUseCase.execute({
        cardId: cardId.value.getStringValue(),
        curatorId: curatorDid,
        addToCollections: [collectionId.value.getStringValue()],
        context: OperationContext.FIREHOSE_EVENT,
        publishedRecordIds: {
          collectionLinks: collectionLinkMap,
        },
      });

      if (result.isErr()) {
        console.warn(
          `Failed to add card to collection: ${result.error.message}`,
        );
        return ok(undefined);
      }

      console.log(`Successfully added card to collection from firehose event`);
      return ok(undefined);
    } catch (error) {
      console.error(`Error processing collection link create event: ${error}`);
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
        console.warn(
          `Invalid AT URI format: ${request.atUri} - ${atUriResult.error.message}`,
        );
        return ok(undefined);
      }
      const curatorDid = atUriResult.value.did.value;

      // Handle collection link deletion if we have it in our system
      const linkInfoResult =
        await this.atUriResolutionService.resolveCollectionLinkId(
          request.atUri,
        );
      if (linkInfoResult.isErr()) {
        console.warn(
          `Failed to resolve collection link: ${linkInfoResult.error.message}`,
        );
        return ok(undefined);
      }

      if (linkInfoResult.value) {
        console.log(
          `Collection link deleted externally: ${request.atUri}, removing from our system`,
        );

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
          console.warn(
            `Failed to remove card from collection: ${result.error.message}`,
          );
          return ok(undefined);
        }

        console.log(
          `Successfully removed card from collection from firehose event`,
        );
      }

      return ok(undefined);
    } catch (error) {
      console.error(`Error processing collection link delete event: ${error}`);
      return ok(undefined);
    }
  }
}
