import { Result, ok, err } from '../../../../../shared/core/Result';
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';
import { ICardRepository } from '../../../domain/ICardRepository';
import { CardId } from '../../../domain/value-objects/CardId';
import { CollectionId } from '../../../domain/value-objects/CollectionId';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { CardCollectionService } from '../../../domain/services/CardCollectionService';
import { CardContent } from '../../../domain/value-objects/CardContent';
import { CardLibraryService } from '../../../domain/services/CardLibraryService';
import { PublishedRecordId } from '../../../domain/value-objects/PublishedRecordId';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';

export enum OperationContext {
  USER_INITIATED = 'user_initiated',
  FIREHOSE_EVENT = 'firehose_event',
  SYSTEM_MIGRATION = 'system_migration',
}

export interface UpdateAnnotationAssociationsDTO {
  cardId: string;
  curatorId: string;
  note?: string;
  addToCollections?: string[];
  removeFromCollections?: string[];
  viaCardId?: string;
  context?: OperationContext;
  publishedRecordIds?: {
    annotationCard?: PublishedRecordId;
    collectionLinks?: Map<string, PublishedRecordId>;
  };
  timestamp?: Date; // For firehose events - use historical timestamp from AT Protocol record
}

export interface UpdateAnnotationAssociationsResponseDTO {
  annotationCardId: string;
  addedToCollections: string[];
  removedFromCollections: string[];
}

export class AnnotationValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class UpdateAnnotationAssociationsUseCase extends BaseUseCase<
  UpdateAnnotationAssociationsDTO,
  Result<
    UpdateAnnotationAssociationsResponseDTO,
    AnnotationValidationError | AuthenticationError | AppError.UnexpectedError
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
    request: UpdateAnnotationAssociationsDTO,
  ): Promise<
    Result<
      UpdateAnnotationAssociationsResponseDTO,
      AnnotationValidationError | AuthenticationError | AppError.UnexpectedError
    >
  > {
    try {
      // Validate and create CuratorId
      const curatorIdResult = CuratorId.create(request.curatorId);
      if (curatorIdResult.isErr()) {
        return err(
          new AnnotationValidationError(
            `Invalid curator ID: ${curatorIdResult.error.message}`,
          ),
        );
      }
      const curatorId = curatorIdResult.value;

      // Validate and create CardId
      const cardIdResult = CardId.createFromString(request.cardId);
      if (cardIdResult.isErr()) {
        return err(
          new AnnotationValidationError(
            `Invalid card ID: ${cardIdResult.error.message}`,
          ),
        );
      }
      const cardId = cardIdResult.value;

      // Find the annotation card - it must already exist
      const existingCardResult = await this.cardRepository.findById(cardId);
      if (existingCardResult.isErr()) {
        return err(AppError.UnexpectedError.create(existingCardResult.error));
      }

      const annotationCard = existingCardResult.value;
      if (!annotationCard) {
        return err(new AnnotationValidationError('Annotation card not found.'));
      }

      // Verify it's an annotation card
      if (!annotationCard.isAnnotationCard) {
        return err(
          new AnnotationValidationError(
            'Card must be an annotation card to update associations.',
          ),
        );
      }

      // Verify ownership
      if (!annotationCard.curatorId.equals(curatorId)) {
        return err(
          new AnnotationValidationError(
            'You do not have permission to update this card.',
          ),
        );
      }

      // The annotation's note lives in its own content (unlike URL cards,
      // whose notes are separate NOTE cards)
      let card = annotationCard;
      if (request.note !== undefined) {
        const annotationContent = card.content.annotationContent;
        if (!annotationContent) {
          return err(
            new AnnotationValidationError(
              'Annotation card has no annotation content.',
            ),
          );
        }

        // An empty/whitespace-only note clears the note; the selectors are
        // carried over unchanged
        const trimmedNote =
          request.note.trim() === '' ? undefined : request.note;

        const newContentResult = CardContent.createAnnotationContent(
          annotationContent.selectors,
          trimmedNote,
        );
        if (newContentResult.isErr()) {
          return err(
            new AnnotationValidationError(newContentResult.error.message),
          );
        }

        const updateContentResult = card.updateContent(newContentResult.value);
        if (updateContentResult.isErr()) {
          return err(
            new AnnotationValidationError(updateContentResult.error.message),
          );
        }

        // Determine service options based on context
        const isFirehoseEvent =
          request.context === OperationContext.FIREHOSE_EVENT;
        const updateOptions =
          isFirehoseEvent && request.publishedRecordIds?.annotationCard
            ? {
                skipPublishing: true,
                publishedRecordId: request.publishedRecordIds.annotationCard,
                timestamp: request.timestamp,
              }
            : request.timestamp
              ? { timestamp: request.timestamp }
              : undefined;

        // Update in library (handles save and republish)
        const updateResult = await this.cardLibraryService.updateCardInLibrary(
          card,
          curatorId,
          updateOptions,
        );
        if (updateResult.isErr()) {
          if (updateResult.error instanceof AuthenticationError) {
            return err(updateResult.error);
          }
          if (updateResult.error instanceof AppError.UnexpectedError) {
            return err(updateResult.error);
          }
          return err(new AnnotationValidationError(updateResult.error.message));
        }

        card = updateResult.value;
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
              new AnnotationValidationError(
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
                timestamp: request.timestamp,
              }
            : request.timestamp
              ? { timestamp: request.timestamp }
              : undefined;

        // Validate and create viaCardId if provided
        let viaCardId: CardId | undefined;
        if (request.viaCardId) {
          const viaCardIdResult = CardId.createFromString(request.viaCardId);
          if (viaCardIdResult.isErr()) {
            return err(
              new AnnotationValidationError(
                `Invalid via card ID: ${viaCardIdResult.error.message}`,
              ),
            );
          }
          viaCardId = viaCardIdResult.value;
        }

        const addToCollectionsResult =
          await this.cardCollectionService.addCardToCollections(
            card,
            collectionIds,
            curatorId,
            viaCardId,
            collectionOptions,
          );
        if (addToCollectionsResult.isErr()) {
          if (addToCollectionsResult.error instanceof AuthenticationError) {
            return err(addToCollectionsResult.error);
          }
          if (
            addToCollectionsResult.error instanceof AppError.UnexpectedError
          ) {
            return err(addToCollectionsResult.error);
          }
          return err(
            new AnnotationValidationError(addToCollectionsResult.error.message),
          );
        }

        // Publish events for all affected collections
        for (const collection of addToCollectionsResult.value) {
          const publishResult =
            await this.publishEventsForAggregate(collection);
          if (publishResult.isErr()) {
            console.error(
              'Failed to publish events for collection:',
              publishResult.error,
            );
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
              new AnnotationValidationError(
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
            card,
            collectionIds,
            curatorId,
            collectionOptions,
          );
        if (removeFromCollectionsResult.isErr()) {
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
            new AnnotationValidationError(
              removeFromCollectionsResult.error.message,
            ),
          );
        }

        // Publish events for all affected collections
        for (const collection of removeFromCollectionsResult.value) {
          const publishResult =
            await this.publishEventsForAggregate(collection);
          if (publishResult.isErr()) {
            console.error(
              'Failed to publish events for collection:',
              publishResult.error,
            );
          }
          removedFromCollections.push(collection.collectionId.getStringValue());
        }
      }

      return ok({
        annotationCardId: card.cardId.getStringValue(),
        addedToCollections,
        removedFromCollections,
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
