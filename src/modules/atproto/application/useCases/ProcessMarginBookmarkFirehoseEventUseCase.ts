import { Result, ok, err } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { AppError } from 'src/shared/core/AppError';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';
import { ATUri } from '../../domain/ATUri';
import { Record as MarginBookmarkRecord } from '../../infrastructure/lexicon/types/at/margin/bookmark';
import { AddUrlToLibraryUseCase } from '../../../cards/application/useCases/commands/AddUrlToLibraryUseCase';
import { RemoveCardFromLibraryUseCase } from '../../../cards/application/useCases/commands/RemoveCardFromLibraryUseCase';

export interface ProcessMarginBookmarkFirehoseEventDTO {
  atUri: string;
  cid: string | null;
  eventType: 'create' | 'update' | 'delete';
  record?: MarginBookmarkRecord;
}

const ENABLE_FIREHOSE_LOGGING = true;

export class ProcessMarginBookmarkFirehoseEventUseCase
  implements UseCase<ProcessMarginBookmarkFirehoseEventDTO, Result<void>>
{
  constructor(
    private atUriResolutionService: IAtUriResolutionService,
    private addUrlToLibraryUseCase: AddUrlToLibraryUseCase,
    private removeCardFromLibraryUseCase: RemoveCardFromLibraryUseCase,
  ) {}

  async execute(
    request: ProcessMarginBookmarkFirehoseEventDTO,
  ): Promise<Result<void>> {
    try {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Processing Margin bookmark event: ${request.atUri} (${request.eventType})`,
        );
      }

      switch (request.eventType) {
        case 'create':
          return await this.handleBookmarkCreate(request);
        case 'update':
          // Margin bookmarks don't support updates for now
          if (ENABLE_FIREHOSE_LOGGING) {
            console.log(
              `[FirehoseWorker] Ignoring Margin bookmark update: ${request.atUri}`,
            );
          }
          return ok(undefined);
        case 'delete':
          return await this.handleBookmarkDelete(request);
      }

      return ok(undefined);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  private async handleBookmarkCreate(
    request: ProcessMarginBookmarkFirehoseEventDTO,
  ): Promise<Result<void>> {
    if (!request.record || !request.cid) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.warn(
          `[FirehoseWorker] Margin bookmark create event missing record or cid, skipping: ${request.atUri}`,
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
      const atUri = atUriResult.value;
      const curatorDid = atUri.did.value;

      // Extract URL from Margin bookmark's 'source' field
      const url = request.record.source;
      if (!url) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Margin bookmark missing source URL - user: ${curatorDid}, uri: ${request.atUri}`,
          );
        }
        return ok(undefined);
      }

      const publishedRecordId = PublishedRecordId.create({
        uri: request.atUri,
        cid: request.cid,
      });

      const result = await this.addUrlToLibraryUseCase.execute({
        url: url,
        curatorId: curatorDid,
        publishedRecordId: publishedRecordId,
        viaCardId: undefined, // Margin bookmarks don't have 'via' references
      });

      if (result.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to add Margin bookmark to library - user: ${curatorDid}, uri: ${request.atUri}, error: ${result.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Successfully created Margin bookmark - user: ${curatorDid}, cardId: ${result.value.urlCardId}, uri: ${request.atUri}`,
        );
      }

      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing Margin bookmark create event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined); // Don't fail the firehose processing
    }
  }

  private async handleBookmarkDelete(
    request: ProcessMarginBookmarkFirehoseEventDTO,
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

      const cardIdResult = await this.atUriResolutionService.resolveCardId(
        request.atUri,
      );
      if (cardIdResult.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to resolve Margin bookmark card ID - user: ${curatorDid}, uri: ${request.atUri}, error: ${cardIdResult.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (cardIdResult.value) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Margin bookmark deleted externally - user: ${curatorDid}, cardId: ${cardIdResult.value.getStringValue()}, uri: ${request.atUri}`,
          );
        }

        const publishedRecordId = PublishedRecordId.create({
          uri: request.atUri,
          cid: request.cid || 'deleted',
        });

        const result = await this.removeCardFromLibraryUseCase.execute({
          cardId: cardIdResult.value.getStringValue(),
          curatorId: curatorDid,
          publishedRecordId: publishedRecordId,
        });

        if (result.isErr()) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.warn(
              `[FirehoseWorker] Failed to remove Margin bookmark from library - user: ${curatorDid}, cardId: ${cardIdResult.value.getStringValue()}, uri: ${request.atUri}, error: ${result.error.message}`,
            );
          }
          return ok(undefined);
        }

        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Successfully removed Margin bookmark from library - user: ${curatorDid}, cardId: ${result.value.cardId}, uri: ${request.atUri}`,
          );
        }
      }

      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing Margin bookmark delete event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined);
    }
  }
}
