import { Result, ok, err } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { AppError } from 'src/shared/core/AppError';
import { IAtUriResolutionService } from '../../../cards/domain/services/IAtUriResolutionService';
import { PublishedRecordId } from '../../../cards/domain/value-objects/PublishedRecordId';
import { ATUri } from '../../domain/ATUri';
import {
  Record as CardRecord,
  NoteContent,
  UrlContent,
} from '../../infrastructure/lexicon/types/network/cosmik/card';
import { AddUrlToLibraryUseCase } from '../../../cards/application/useCases/commands/AddUrlToLibraryUseCase';
import {
  UpdateUrlCardAssociationsUseCase,
  OperationContext,
} from '../../../cards/application/useCases/commands/UpdateUrlCardAssociationsUseCase';
import { RemoveCardFromLibraryUseCase } from '../../../cards/application/useCases/commands/RemoveCardFromLibraryUseCase';
import { ICardRepository } from '../../../cards/domain/ICardRepository';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardId } from 'src/modules/cards/domain/value-objects/CardId';
export interface ProcessCardFirehoseEventDTO {
  atUri: string;
  cid: string | null;
  eventType: 'create' | 'update' | 'delete';
  record?: CardRecord;
}

const ENABLE_FIREHOSE_LOGGING = true;
export class ProcessCardFirehoseEventUseCase
  implements UseCase<ProcessCardFirehoseEventDTO, Result<void>>
{
  constructor(
    private atUriResolutionService: IAtUriResolutionService,
    private addUrlToLibraryUseCase: AddUrlToLibraryUseCase,
    private updateUrlCardAssociationsUseCase: UpdateUrlCardAssociationsUseCase,
    private removeCardFromLibraryUseCase: RemoveCardFromLibraryUseCase,
    private cardRepository: ICardRepository,
  ) {}

  async execute(request: ProcessCardFirehoseEventDTO): Promise<Result<void>> {
    try {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Processing card event: ${request.atUri} (${request.eventType})`,
        );
      }

      switch (request.eventType) {
        case 'create':
          return await this.handleCardCreate(request);
        case 'update':
          return await this.handleCardUpdate(request);
        case 'delete':
          return await this.handleCardDelete(request);
      }

      return ok(undefined);
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  private async handleCardCreate(
    request: ProcessCardFirehoseEventDTO,
  ): Promise<Result<void>> {
    if (!request.record || !request.cid) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.warn(
          `[FirehoseWorker] Card create event missing record or cid, skipping: ${request.atUri}`,
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

      // Extract timestamp from AT Protocol record
      const timestamp = request.record.createdAt
        ? new Date(request.record.createdAt)
        : undefined;

      const publishedRecordId = PublishedRecordId.create({
        uri: request.atUri,
        cid: request.cid,
      });

      if (request.record.type === 'URL') {
        // Handle URL card creation
        const urlContent = request.record.content as UrlContent;
        if (!urlContent.url) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.warn(
              `[FirehoseWorker] URL card missing URL - user: ${curatorDid}, uri: ${request.atUri}`,
            );
          }
          return ok(undefined);
        }

        let viaCardId: CardId | undefined = undefined;
        const viaAtUri = request.record.provenance?.via?.uri;
        if (viaAtUri) {
          const viaCardIdResult =
            await this.atUriResolutionService.resolveCardId(viaAtUri);
          if (viaCardIdResult.isOk()) {
            viaCardId = viaCardIdResult.value || undefined;
          }
        }

        const result = await this.addUrlToLibraryUseCase.execute({
          url: urlContent.url,
          curatorId: curatorDid,
          publishedRecordId: publishedRecordId,
          viaCardId: viaCardId?.getStringValue(),
          timestamp: timestamp,
        });

        if (result.isErr()) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.warn(
              `[FirehoseWorker] Failed to add URL to library - user: ${curatorDid}, uri: ${request.atUri}, error: ${result.error.message}`,
            );
          }
          return ok(undefined);
        }

        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Successfully created URL card - user: ${curatorDid}, cardId: ${result.value.urlCardId}, uri: ${request.atUri}`,
          );
        }
      } else if (request.record.type === 'NOTE') {
        // Handle note card creation
        const noteContent = request.record.content as NoteContent;
        if (!noteContent.text) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.warn(
              `[FirehoseWorker] Note card missing text - user: ${curatorDid}, uri: ${request.atUri}`,
            );
          }
          return ok(undefined);
        }

        // Get parent card from parentCard reference
        if (!request.record.parentCard) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.warn(
              `[FirehoseWorker] Note card missing parent card reference - user: ${curatorDid}, uri: ${request.atUri}`,
            );
          }
          return ok(undefined);
        }

        // Resolve parent card ID from AT URI
        const parentCardId = await this.atUriResolutionService.resolveCardId(
          request.record.parentCard.uri,
        );
        if (parentCardId.isErr() || !parentCardId.value) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.warn(
              `[FirehoseWorker] Failed to resolve parent card - user: ${curatorDid}, parentUri: ${request.record.parentCard.uri}, noteUri: ${request.atUri}`,
            );
          }
          return ok(undefined);
        }

        // Get the parent card to check if a note already exists
        const parentCardResult = await this.cardRepository.findById(
          parentCardId.value,
        );
        if (parentCardResult.isErr() || !parentCardResult.value) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.warn(
              `[FirehoseWorker] Failed to find parent card - user: ${curatorDid}, parentCardId: ${parentCardId.value.getStringValue()}, noteUri: ${request.atUri}`,
            );
          }
          return ok(undefined);
        }

        const parentCard = parentCardResult.value;
        if (!parentCard.url) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.warn(
              `[FirehoseWorker] Parent card has no URL - user: ${curatorDid}, parentCardId: ${parentCardId.value.getStringValue()}, noteUri: ${request.atUri}`,
            );
          }
          return ok(undefined);
        }

        // Check if a note card already exists for this URL and curator
        const curatorIdResult = CuratorId.create(curatorDid);
        if (curatorIdResult.isErr()) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.warn(
              `[FirehoseWorker] Invalid curator ID - user: ${curatorDid}, noteUri: ${request.atUri}`,
            );
          }
          return ok(undefined);
        }

        const existingNoteResult =
          await this.cardRepository.findUsersNoteCardByUrl(
            parentCard.url,
            curatorIdResult.value,
          );
        if (existingNoteResult.isErr()) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.warn(
              `[FirehoseWorker] Failed to check for existing note card - user: ${curatorDid}, url: ${parentCard.url.value}, noteUri: ${request.atUri}`,
            );
          }
          return ok(undefined);
        }

        if (existingNoteResult.value) {
          // A note card already exists for this URL, skip creating a new one
          if (ENABLE_FIREHOSE_LOGGING) {
            console.log(
              `[FirehoseWorker] Note card already exists for URL, skipping creation - user: ${curatorDid}, url: ${parentCard.url.value}, existingNoteId: ${existingNoteResult.value.cardId.getStringValue()}, skippedNoteUri: ${request.atUri}`,
            );
          }
          return ok(undefined);
        }

        const result = await this.updateUrlCardAssociationsUseCase.execute({
          cardId: parentCardId.value.getStringValue(),
          curatorId: curatorDid,
          note: noteContent.text,
          context: OperationContext.FIREHOSE_EVENT,
          publishedRecordIds: {
            noteCard: publishedRecordId,
          },
          timestamp: timestamp,
        });

        if (result.isErr()) {
          if (ENABLE_FIREHOSE_LOGGING) {
            console.warn(
              `[FirehoseWorker] Failed to create note card - user: ${curatorDid}, parentCardId: ${parentCardId.value.getStringValue()}, uri: ${request.atUri}, error: ${result.error.message}`,
            );
          }
          return ok(undefined);
        }

        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Successfully created note card - user: ${curatorDid}, noteCardId: ${result.value.noteCardId}, parentCardId: ${parentCardId.value.getStringValue()}, uri: ${request.atUri}`,
          );
        }
      }

      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing card create event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined); // Don't fail the firehose processing
    }
  }

  private async handleCardUpdate(
    request: ProcessCardFirehoseEventDTO,
  ): Promise<Result<void>> {
    if (!request.record || !request.cid) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.warn(
          `[FirehoseWorker] Card update event missing record or cid, skipping: ${request.atUri}`,
        );
      }
      return ok(undefined);
    }

    // Only handle NOTE card updates for now
    if (request.record.type !== 'NOTE') {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Ignoring update for card type: ${request.record.type}, uri: ${request.atUri}`,
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

      const noteContent = request.record.content as NoteContent;
      if (!noteContent.text) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Note card missing text - user: ${curatorDid}, uri: ${request.atUri}`,
          );
        }
        return ok(undefined);
      }

      // Get parent card from parentCard reference
      if (!request.record.parentCard) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Note card missing parent card reference - user: ${curatorDid}, uri: ${request.atUri}`,
          );
        }
        return ok(undefined);
      }

      // Resolve parent card ID from AT URI
      const parentCardId = await this.atUriResolutionService.resolveCardId(
        request.record.parentCard.uri,
      );
      if (parentCardId.isErr() || !parentCardId.value) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to resolve parent card - user: ${curatorDid}, parentUri: ${request.record.parentCard.uri}, noteUri: ${request.atUri}`,
          );
        }
        return ok(undefined);
      }

      // Extract timestamp from AT Protocol record
      const timestamp = request.record.createdAt
        ? new Date(request.record.createdAt)
        : undefined;

      const publishedRecordId = PublishedRecordId.create({
        uri: request.atUri,
        cid: request.cid,
      });

      const result = await this.updateUrlCardAssociationsUseCase.execute({
        cardId: parentCardId.value.getStringValue(),
        curatorId: curatorDid,
        note: noteContent.text,
        context: OperationContext.FIREHOSE_EVENT,
        publishedRecordIds: {
          noteCard: publishedRecordId,
        },
        timestamp: timestamp,
      });

      if (result.isErr()) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.warn(
            `[FirehoseWorker] Failed to update note card - user: ${curatorDid}, parentCardId: ${parentCardId.value.getStringValue()}, uri: ${request.atUri}, error: ${result.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (ENABLE_FIREHOSE_LOGGING) {
        console.log(
          `[FirehoseWorker] Successfully updated note card - user: ${curatorDid}, noteCardId: ${result.value.noteCardId}, parentCardId: ${parentCardId.value.getStringValue()}, uri: ${request.atUri}`,
        );
      }
      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing card update event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined); // Don't fail the firehose processing
    }
  }

  private async handleCardDelete(
    request: ProcessCardFirehoseEventDTO,
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
            `[FirehoseWorker] Failed to resolve card ID - user: ${curatorDid}, uri: ${request.atUri}, error: ${cardIdResult.error.message}`,
          );
        }
        return ok(undefined);
      }

      if (cardIdResult.value) {
        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Card deleted externally - user: ${curatorDid}, cardId: ${cardIdResult.value.getStringValue()}, uri: ${request.atUri}`,
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
              `[FirehoseWorker] Failed to remove card from library - user: ${curatorDid}, cardId: ${cardIdResult.value.getStringValue()}, uri: ${request.atUri}, error: ${result.error.message}`,
            );
          }
          return ok(undefined);
        }

        if (ENABLE_FIREHOSE_LOGGING) {
          console.log(
            `[FirehoseWorker] Successfully removed card from library - user: ${curatorDid}, cardId: ${result.value.cardId}, uri: ${request.atUri}`,
          );
        }
      }

      return ok(undefined);
    } catch (error) {
      if (ENABLE_FIREHOSE_LOGGING) {
        console.error(
          `[FirehoseWorker] Error processing card delete event - uri: ${request.atUri}, error: ${error}`,
        );
      }
      return ok(undefined);
    }
  }
}
