import { Result, ok, err } from '../../../../../shared/core/Result';
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';
import { ICardRepository } from '../../../domain/ICardRepository';
import { INoteCardInput } from '../../../domain/CardFactory';
import { CardId } from '../../../domain/value-objects/CardId';
import { CollectionId } from '../../../domain/value-objects/CollectionId';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { CardTypeEnum } from '../../../domain/value-objects/CardType';
import { CardCollectionService } from '../../../domain/services/CardCollectionService';
import { CardContent } from '../../../domain/value-objects/CardContent';
import { CardFactory } from '../../../domain/CardFactory';
import { CardLibraryService } from '../../../domain/services/CardLibraryService';
import { PublishedRecordId } from '../../../domain/value-objects/PublishedRecordId';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export enum OperationContext {
  USER_INITIATED = 'user_initiated',
  FIREHOSE_EVENT = 'firehose_event',
  SYSTEM_MIGRATION = 'system_migration',
}

export interface UpdateUrlCardAssociationsDTO {
  cardId: string;
  curatorId: string;
  note?: string;
  addToCollections?: string[];
  removeFromCollections?: string[];
  viaCardId?: string;
  context?: OperationContext;
  publishedRecordIds?: {
    noteCard?: PublishedRecordId;
    collectionLinks?: Map<string, PublishedRecordId>;
  };
}

export interface UpdateUrlCardAssociationsResponseDTO {
  urlCardId: string;
  noteCardId?: string;
  addedToCollections: string[];
  removedFromCollections: string[];
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class UpdateUrlCardAssociationsUseCase extends BaseUseCase<
  UpdateUrlCardAssociationsDTO,
  Result<
    UpdateUrlCardAssociationsResponseDTO,
    ValidationError | AuthenticationError | AppError.UnexpectedError
  >
> {
  constructor(
    private cardRepository: ICardRepository,
    private cardLibraryService: CardLibraryService,
    private cardCollectionService: CardCollectionService,
    eventPublisher: IEventPublisher,
  ) {
    super(eventPublisher);
  }

  async execute(
    request: UpdateUrlCardAssociationsDTO,
  ): Promise<
    Result<
      UpdateUrlCardAssociationsResponseDTO,
      ValidationError | AuthenticationError | AppError.UnexpectedError
    >
  > {
    try {
      // Validate and create CuratorId
      const curatorIdResult = CuratorId.create(request.curatorId);
      if (curatorIdResult.isErr()) {
        return err(
          new ValidationError(
            `Invalid curator ID: ${curatorIdResult.error.message}`,
          ),
        );
      }
      const curatorId = curatorIdResult.value;

      // Validate and create CardId
      const cardIdResult = CardId.createFromString(request.cardId);
      if (cardIdResult.isErr()) {
        return err(
          new ValidationError(`Invalid card ID: ${cardIdResult.error.message}`),
        );
      }
      const cardId = cardIdResult.value;

      // Find the URL card - it must already exist
      const existingUrlCardResult = await this.cardRepository.findById(cardId);
      if (existingUrlCardResult.isErr()) {
        return err(
          AppError.UnexpectedError.create(existingUrlCardResult.error),
        );
      }

      const urlCard = existingUrlCardResult.value;
      if (!urlCard) {
        return err(
          new ValidationError(
            'URL card not found. Please add the URL to your library first.',
          ),
        );
      }

      // Verify it's a URL card
      if (!urlCard.isUrlCard) {
        return err(
          new ValidationError(
            'Card must be a URL card to update associations.',
          ),
        );
      }

      // Verify ownership
      if (!urlCard.curatorId.equals(curatorId)) {
        return err(
          new ValidationError(
            'You do not have permission to update this card.',
          ),
        );
      }

      // Get the URL from the card for note operations
      if (!urlCard.url) {
        return err(new ValidationError('URL card must have a URL property.'));
      }
      const url = urlCard.url;

      let noteCard;

      // Handle note updates/creation
      if (request.note !== undefined) {
        // Check if note card already exists
        const existingNoteCardResult =
          await this.cardRepository.findUsersNoteCardByUrl(url, curatorId);
        if (existingNoteCardResult.isErr()) {
          return err(
            AppError.UnexpectedError.create(existingNoteCardResult.error),
          );
        }

        noteCard = existingNoteCardResult.value;

        if (noteCard) {
          // Update existing note card
          const newContentResult = CardContent.createNoteContent(request.note);
          if (newContentResult.isErr()) {
            return err(new ValidationError(newContentResult.error.message));
          }

          const updateContentResult = noteCard.updateContent(
            newContentResult.value,
          );
          if (updateContentResult.isErr()) {
            return err(new ValidationError(updateContentResult.error.message));
          }

          // Determine service options based on context
          const isFirehoseEvent =
            request.context === OperationContext.FIREHOSE_EVENT;
          const noteCardOptions =
            isFirehoseEvent && request.publishedRecordIds?.noteCard
              ? {
                  skipPublishing: true,
                  publishedRecordId: request.publishedRecordIds.noteCard,
                }
              : undefined;

          // Update note card in library (handles save and republish)
          const updateNoteResult =
            await this.cardLibraryService.updateCardInLibrary(
              noteCard,
              curatorId,
              noteCardOptions,
            );
          if (updateNoteResult.isErr()) {
            // Propagate authentication errors
            if (updateNoteResult.error instanceof AuthenticationError) {
              return err(updateNoteResult.error);
            }
            if (updateNoteResult.error instanceof AppError.UnexpectedError) {
              return err(updateNoteResult.error);
            }
            return err(new ValidationError(updateNoteResult.error.message));
          }

          // Update noteCard reference to the one returned by the service
          noteCard = updateNoteResult.value;
        } else {
          // Create new note card
          const noteCardInput: INoteCardInput = {
            type: CardTypeEnum.NOTE,
            text: request.note,
            parentCardId: urlCard.cardId.getStringValue(),
            url: url.value,
          };

          const noteCardResult = CardFactory.create({
            curatorId: request.curatorId,
            cardInput: noteCardInput,
          });

          if (noteCardResult.isErr()) {
            return err(new ValidationError(noteCardResult.error.message));
          }

          noteCard = noteCardResult.value;

          // Save note card
          const saveNoteCardResult = await this.cardRepository.save(noteCard);
          if (saveNoteCardResult.isErr()) {
            return err(
              AppError.UnexpectedError.create(saveNoteCardResult.error),
            );
          }

          // Determine service options based on context
          const isFirehoseEvent =
            request.context === OperationContext.FIREHOSE_EVENT;
          const noteCardOptions =
            isFirehoseEvent && request.publishedRecordIds?.noteCard
              ? {
                  skipPublishing: true,
                  publishedRecordId: request.publishedRecordIds.noteCard,
                }
              : undefined;

          // Add note card to library using domain service
          const addNoteCardToLibraryResult =
            await this.cardLibraryService.addCardToLibrary(
              noteCard,
              curatorId,
              noteCardOptions,
            );
          if (addNoteCardToLibraryResult.isErr()) {
            // Propagate authentication errors
            if (
              addNoteCardToLibraryResult.error instanceof AuthenticationError
            ) {
              return err(addNoteCardToLibraryResult.error);
            }
            if (
              addNoteCardToLibraryResult.error instanceof
              AppError.UnexpectedError
            ) {
              return err(addNoteCardToLibraryResult.error);
            }
            return err(
              new ValidationError(addNoteCardToLibraryResult.error.message),
            );
          }

          // Update noteCard reference to the one returned by the service
          noteCard = addNoteCardToLibraryResult.value;
        }
      }

      const addedToCollections: string[] = [];
      const removedFromCollections: string[] = [];

      // Handle adding to collections
      if (request.addToCollections && request.addToCollections.length > 0) {
        const collectionIds: CollectionId[] = [];
        for (const collectionIdStr of request.addToCollections) {
          const collectionIdResult =
            CollectionId.createFromString(collectionIdStr);
          if (collectionIdResult.isErr()) {
            return err(
              new ValidationError(
                `Invalid collection ID: ${collectionIdResult.error.message}`,
              ),
            );
          }
          collectionIds.push(collectionIdResult.value);
        }

        // Determine service options based on context
        const isFirehoseEvent =
          request.context === OperationContext.FIREHOSE_EVENT;
        const collectionOptions =
          isFirehoseEvent && request.publishedRecordIds?.collectionLinks
            ? {
                skipPublishing: true,
                publishedRecordIds: request.publishedRecordIds.collectionLinks,
              }
            : undefined;

        // Validate and create viaCardId if provided
        let viaCardId: CardId | undefined;
        if (request.viaCardId) {
          const viaCardIdResult = CardId.createFromString(request.viaCardId);
          if (viaCardIdResult.isErr()) {
            return err(
              new ValidationError(
                `Invalid via card ID: ${viaCardIdResult.error.message}`,
              ),
            );
          }
          viaCardId = viaCardIdResult.value;
        }

        const addToCollectionsResult =
          await this.cardCollectionService.addCardToCollections(
            urlCard,
            collectionIds,
            curatorId,
            viaCardId,
            collectionOptions,
          );
        if (addToCollectionsResult.isErr()) {
          // Propagate authentication errors
          if (addToCollectionsResult.error instanceof AuthenticationError) {
            return err(addToCollectionsResult.error);
          }
          if (
            addToCollectionsResult.error instanceof AppError.UnexpectedError
          ) {
            return err(addToCollectionsResult.error);
          }
          return err(new ValidationError(addToCollectionsResult.error.message));
        }

        // Publish events for all affected collections
        const updatedCollections = addToCollectionsResult.value;
        for (const collection of updatedCollections) {
          const publishResult =
            await this.publishEventsForAggregate(collection);
          if (publishResult.isErr()) {
            console.error(
              'Failed to publish events for collection:',
              publishResult.error,
            );
            // Don't fail the operation if event publishing fails
          }
          addedToCollections.push(collection.collectionId.getStringValue());
        }
      }

      // Handle removing from collections
      if (
        request.removeFromCollections &&
        request.removeFromCollections.length > 0
      ) {
        const collectionIds: CollectionId[] = [];
        for (const collectionIdStr of request.removeFromCollections) {
          const collectionIdResult =
            CollectionId.createFromString(collectionIdStr);
          if (collectionIdResult.isErr()) {
            return err(
              new ValidationError(
                `Invalid collection ID: ${collectionIdResult.error.message}`,
              ),
            );
          }
          collectionIds.push(collectionIdResult.value);
        }

        // Determine service options based on context
        const isFirehoseEvent =
          request.context === OperationContext.FIREHOSE_EVENT;
        const collectionOptions = isFirehoseEvent
          ? {
              skipPublishing: true,
            }
          : undefined;

        const removeFromCollectionsResult =
          await this.cardCollectionService.removeCardFromCollections(
            urlCard,
            collectionIds,
            curatorId,
            collectionOptions,
          );
        if (removeFromCollectionsResult.isErr()) {
          // Propagate authentication errors
          if (
            removeFromCollectionsResult.error instanceof AuthenticationError
          ) {
            return err(removeFromCollectionsResult.error);
          }
          if (
            removeFromCollectionsResult.error instanceof
            AppError.UnexpectedError
          ) {
            return err(removeFromCollectionsResult.error);
          }
          return err(
            new ValidationError(removeFromCollectionsResult.error.message),
          );
        }

        // Publish events for all affected collections
        const updatedCollections = removeFromCollectionsResult.value;
        for (const collection of updatedCollections) {
          const publishResult =
            await this.publishEventsForAggregate(collection);
          if (publishResult.isErr()) {
            console.error(
              'Failed to publish events for collection:',
              publishResult.error,
            );
            // Don't fail the operation if event publishing fails
          }
          removedFromCollections.push(collection.collectionId.getStringValue());
        }
      }

      return ok({
        urlCardId: urlCard.cardId.getStringValue(),
        noteCardId: noteCard?.cardId.getStringValue(),
        addedToCollections,
        removedFromCollections,
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
