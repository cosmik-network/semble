import { Result, ok, err } from 'src/shared/core/Result';
import { UseCase } from 'src/shared/core/UseCase';
import { UseCaseError } from 'src/shared/core/UseCaseError';
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

export interface ProcessCardFirehoseEventDTO {
  atUri: string;
  cid: string | null;
  eventType: 'create' | 'update' | 'delete';
  record?: CardRecord;
}

export class ProcessCardFirehoseEventUseCase
  implements UseCase<ProcessCardFirehoseEventDTO, Result<void>>
{
  constructor(
    private atUriResolutionService: IAtUriResolutionService,
    private addUrlToLibraryUseCase: AddUrlToLibraryUseCase,
    private updateUrlCardAssociationsUseCase: UpdateUrlCardAssociationsUseCase,
    private removeCardFromLibraryUseCase: RemoveCardFromLibraryUseCase,
  ) {}

  async execute(request: ProcessCardFirehoseEventDTO): Promise<Result<void>> {
    try {
      console.log(
        `Processing card firehose event: ${request.atUri} (${request.eventType})`,
      );

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
      console.warn('Card create event missing record or cid, skipping');
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
      const atUri = atUriResult.value;
      const curatorDid = atUri.did.value;

      const publishedRecordId = PublishedRecordId.create({
        uri: request.atUri,
        cid: request.cid,
      });

      if (request.record.type === 'URL') {
        // Handle URL card creation
        const urlContent = request.record.content as UrlContent;
        if (!urlContent.url) {
          console.warn(`URL card missing URL: ${request.atUri}`);
          return ok(undefined);
        }

        const result = await this.addUrlToLibraryUseCase.execute({
          url: urlContent.url,
          curatorId: curatorDid,
          publishedRecordId: publishedRecordId,
        });

        if (result.isErr()) {
          console.warn(`Failed to add URL to library: ${result.error.message}`);
          return ok(undefined);
        }

        console.log(
          `Successfully created URL card from firehose event: ${result.value.urlCardId}`,
        );
      } else if (request.record.type === 'NOTE') {
        // Handle note card creation
        const noteContent = request.record.content as NoteContent;
        if (!noteContent.text) {
          console.warn(`Note card missing text: ${request.atUri}`);
          return ok(undefined);
        }

        // Get parent card from parentCard reference
        if (!request.record.parentCard) {
          console.warn(
            `Note card missing parent card reference: ${request.atUri}`,
          );
          return ok(undefined);
        }

        // Resolve parent card ID from AT URI
        const parentCardId = await this.atUriResolutionService.resolveCardId(
          request.record.parentCard.uri,
        );
        if (parentCardId.isErr() || !parentCardId.value) {
          console.warn(
            `Failed to resolve parent card: ${request.record.parentCard.uri}`,
          );
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
        });

        if (result.isErr()) {
          console.warn(`Failed to create note card: ${result.error.message}`);
          return ok(undefined);
        }

        console.log(
          `Successfully created note card from firehose event: ${result.value.noteCardId}`,
        );
      }

      return ok(undefined);
    } catch (error) {
      console.error(`Error processing card create event: ${error}`);
      return ok(undefined); // Don't fail the firehose processing
    }
  }

  private async handleCardUpdate(
    request: ProcessCardFirehoseEventDTO,
  ): Promise<Result<void>> {
    if (!request.record || !request.cid) {
      console.warn('Card update event missing record or cid, skipping');
      return ok(undefined);
    }

    // Only handle NOTE card updates for now
    if (request.record.type !== 'NOTE') {
      console.log(`Ignoring update for card type: ${request.record.type}`);
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

      const noteContent = request.record.content as NoteContent;
      if (!noteContent.text) {
        console.warn(`Note card missing text: ${request.atUri}`);
        return ok(undefined);
      }

      // Get parent card from parentCard reference
      if (!request.record.parentCard) {
        console.warn(
          `Note card missing parent card reference: ${request.atUri}`,
        );
        return ok(undefined);
      }

      // Resolve parent card ID from AT URI
      const parentCardId = await this.atUriResolutionService.resolveCardId(
        request.record.parentCard.uri,
      );
      if (parentCardId.isErr() || !parentCardId.value) {
        console.warn(
          `Failed to resolve parent card: ${request.record.parentCard.uri}`,
        );
        return ok(undefined);
      }

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
      });

      if (result.isErr()) {
        console.warn(`Failed to update note card: ${result.error.message}`);
        return ok(undefined);
      }

      console.log(
        `Successfully updated note card from firehose event: ${result.value.noteCardId}`,
      );
      return ok(undefined);
    } catch (error) {
      console.error(`Error processing card update event: ${error}`);
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
        console.warn(
          `Invalid AT URI format: ${request.atUri} - ${atUriResult.error.message}`,
        );
        return ok(undefined);
      }
      const curatorDid = atUriResult.value.did.value;

      const cardIdResult = await this.atUriResolutionService.resolveCardId(
        request.atUri,
      );
      if (cardIdResult.isErr()) {
        console.warn(
          `Failed to resolve card ID: ${cardIdResult.error.message}`,
        );
        return ok(undefined);
      }

      if (cardIdResult.value) {
        console.log(
          `Card deleted externally: ${request.atUri}, removing from library`,
        );

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
          console.warn(
            `Failed to remove card from library: ${result.error.message}`,
          );
          return ok(undefined);
        }

        console.log(
          `Successfully removed card from library: ${result.value.cardId}`,
        );
      }

      return ok(undefined);
    } catch (error) {
      console.error(`Error processing card delete event: ${error}`);
      return ok(undefined);
    }
  }
}
