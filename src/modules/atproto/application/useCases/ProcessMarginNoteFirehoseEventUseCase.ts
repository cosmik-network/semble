import { Result, ok, err } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { AppError } from 'src/shared/core/AppError';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';
import { ATUri } from '../../domain/ATUri';
import { AddUrlToLibraryUseCase } from '../../../cards/application/useCases/commands/AddUrlToLibraryUseCase';
import { RemoveCardFromLibraryUseCase } from '../../../cards/application/useCases/commands/RemoveCardFromLibraryUseCase';

// Margin Note Record type definition
interface MarginNoteTarget {
  title?: string;
  source: string;
  sourceHash?: string;
  [k: string]: unknown;
}

interface MarginNoteRecord {
  $type: 'at.margin.note';
  target: MarginNoteTarget;
  createdAt: string;
  motivation?: string;
  [k: string]: unknown;
}

export interface ProcessMarginNoteFirehoseEventDTO {
  atUri: string;
  cid: string | null;
  eventType: 'create' | 'update' | 'delete';
  record?: MarginNoteRecord;
}

const ENABLE_FIREHOSE_LOGGING = true;

export class ProcessMarginNoteFirehoseEventUseCase
  implements UseCase<ProcessMarginNoteFirehoseEventDTO, Result<void>>
{
  constructor(
    private atUriResolutionService: IAtUriResolutionService,
    private addUrlToLibraryUseCase: AddUrlToLibraryUseCase,
    private removeCardFromLibraryUseCase: RemoveCardFromLibraryUseCase,
  ) {}

  async execute(
    request: ProcessMarginNoteFirehoseEventDTO,
  ): Promise<Result<void>> {
    try {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Processing Margin note event: ${request.atUri} (${request.eventType})`,
        );
      }

      switch (request.eventType) {
        case 'create':
          return await this.handleNoteCreate(request);
        case 'update':
          // Margin notes don't support updates for now
          if (ENABLE_FIREHOSE_LOGGING) {
            console.log(
              `[FirehoseWorker] Ignoring Margin note update: ${request.atUri}`,
            );
          }
          return ok(undefined);
        case 'delete':
          return await this.handleNoteDelete(request);
      }

      return ok(undefined);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  private async handleNoteCreate(
    request: ProcessMarginNoteFirehoseEventDTO,
  ): Promise<Result<void>> {
    if (!request.record || !request.cid) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.warn(
          `[FirehoseWorker] Margin note create event missing record or cid, skipping: ${request.atUri}`,
        );
      }
      return ok(undefined);
    }

    // Only process notes with 'bookmarking' motivation
    if (request.record.motivation !== 'bookmarking') {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Skipping Margin note with motivation '${request.record.motivation}' (only processing 'bookmarking'): ${request.atUri}`,
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

      // Extract URL from Margin note's 'target.source' field
      const url = request.record.target.source;
      if (!url) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Margin note missing target source URL - user: ${curatorDid}, uri: ${request.atUri}`,
          );
        }
        return ok(undefined);
      }

      // Extract timestamp from AT Protocol record (Margin note has required createdAt)
      const timestamp = new Date(request.record.createdAt);

      const publishedRecordId = PublishedRecordId.create({
        uri: request.atUri,
        cid: request.cid,
      });

      const result = await this.addUrlToLibraryUseCase.execute({
        url: url,
        curatorId: curatorDid,
        publishedRecordId: publishedRecordId,
        viaCardId: undefined, // Margin notes don't have 'via' references
        timestamp: timestamp,
      });

      if (result.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to add Margin note to library - user: ${curatorDid}, uri: ${request.atUri}, error: ${result.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Successfully created Margin note - user: ${curatorDid}, cardId: ${result.value.urlCardId}, uri: ${request.atUri}`,
        );
      }

      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing Margin note create event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined); // Don't fail the firehose processing
    }
  }

  private async handleNoteDelete(
    request: ProcessMarginNoteFirehoseEventDTO,
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
            `[FirehoseWorker] Failed to resolve Margin note card ID - user: ${curatorDid}, uri: ${request.atUri}, error: ${cardIdResult.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (cardIdResult.value) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Margin note deleted externally - user: ${curatorDid}, cardId: ${cardIdResult.value.getStringValue()}, uri: ${request.atUri}`,
          );
        }

        // For delete events, we don't have a record, so no timestamp available
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
              `[FirehoseWorker] Failed to remove Margin note from library - user: ${curatorDid}, cardId: ${cardIdResult.value.getStringValue()}, uri: ${request.atUri}, error: ${result.error.message}`,
            );
          }
          return ok(undefined);
        }

        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Successfully removed Margin note from library - user: ${curatorDid}, cardId: ${result.value.cardId}, uri: ${request.atUri}`,
          );
        }
      }

      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing Margin note delete event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined);
    }
  }
}
