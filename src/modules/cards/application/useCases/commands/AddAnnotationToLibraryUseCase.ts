import { Result, ok, err } from '../../../../../shared/core/Result';
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';
import { ICardRepository } from '../../../domain/ICardRepository';
import { CardFactory, IAnnotationCardInput } from '../../../domain/CardFactory';
import { CollectionId } from '../../../domain/value-objects/CollectionId';
import { CardId } from '../../../domain/value-objects/CardId';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { CardTypeEnum } from '../../../domain/value-objects/CardType';
import { URL } from '../../../domain/value-objects/URL';
import { CardLibraryService } from '../../../domain/services/CardLibraryService';
import { CardCollectionService } from '../../../domain/services/CardCollectionService';
import { PublishedRecordId } from '../../../domain/value-objects/PublishedRecordId';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';
import { SelectorTypeEnum } from '../../../domain/value-objects/selectors/SelectorType';

export interface AnnotationSelectorDTO {
  type: SelectorTypeEnum.TEXT_QUOTE;
  exact: string;
  prefix?: string;
  suffix?: string;
}

export interface AddAnnotationToLibraryDTO {
  url: string;
  selectors: AnnotationSelectorDTO[];
  note?: string;
  collectionIds?: string[];
  curatorId: string;
  viaCardId?: string;
  publishedRecordId?: PublishedRecordId; // For firehose events - skip publishing if provided
  timestamp?: Date; // For firehose events - use historical timestamp from AT Protocol record
}

export interface AddAnnotationToLibraryResponseDTO {
  annotationCardId: string;
}

export class AnnotationValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

export class AddAnnotationToLibraryUseCase extends BaseUseCase<
  AddAnnotationToLibraryDTO,
  Result<
    AddAnnotationToLibraryResponseDTO,
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
    request: AddAnnotationToLibraryDTO,
  ): Promise<
    Result<
      AddAnnotationToLibraryResponseDTO,
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

      // Validate URL
      const urlResult = URL.create(request.url);
      if (urlResult.isErr()) {
        return err(
          new AnnotationValidationError(
            `Invalid URL: ${urlResult.error.message}`,
          ),
        );
      }
      const url = urlResult.value;

      // Build the annotation card first so invalid selectors/note fail
      // before any side effects. Annotations anchor purely by their url —
      // the source URL card is deliberately NOT created or saved here.
      const annotationCardInput: IAnnotationCardInput = {
        type: CardTypeEnum.ANNOTATION,
        url: url.value,
        selectors: request.selectors,
        note: request.note,
      };

      const annotationCardResult = CardFactory.create({
        curatorId: request.curatorId,
        cardInput: annotationCardInput,
        createdAt: request.timestamp,
      });
      if (annotationCardResult.isErr()) {
        return err(
          new AnnotationValidationError(annotationCardResult.error.message),
        );
      }
      const annotationCard = annotationCardResult.value;

      // Add the annotation card to the library — publishes it as a web
      // annotation record (at.margin.note in prod) via the card publisher.
      // A firehose-provided record id is the annotation's own record, so
      // adopt it directly.
      const libraryOptions = request.publishedRecordId
        ? {
            skipPublishing: true,
            publishedRecordId: request.publishedRecordId,
            timestamp: request.timestamp,
          }
        : request.timestamp
          ? { timestamp: request.timestamp }
          : undefined;

      const addAnnotationResult =
        await this.cardLibraryService.addCardToLibrary(
          annotationCard,
          curatorId,
          libraryOptions,
        );
      if (addAnnotationResult.isErr()) {
        return err(this.propagateLibraryError(addAnnotationResult.error));
      }
      const savedAnnotationCard = addAnnotationResult.value;

      // Handle collection additions if specified — the annotation card
      // itself is the collection member
      if (request.collectionIds && request.collectionIds.length > 0) {
        const collectionIds: CollectionId[] = [];
        for (const collectionIdStr of request.collectionIds) {
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

        // When the record arrived from the firehose, never publish back —
        // collection-link records arrive as their own firehose events
        const collectionOptions =
          request.publishedRecordId || request.timestamp
            ? {
                ...(request.publishedRecordId && { skipPublishing: true }),
                ...(request.timestamp && { timestamp: request.timestamp }),
              }
            : undefined;

        const addToCollectionsResult =
          await this.cardCollectionService.addCardToCollections(
            savedAnnotationCard,
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

        for (const collection of addToCollectionsResult.value) {
          const publishResult =
            await this.publishEventsForAggregate(collection);
          if (publishResult.isErr()) {
            console.error(
              'Failed to publish events for collection:',
              publishResult.error,
            );
          }
        }
      }

      // Publish events for the annotation card
      const publishAnnotationResult =
        await this.publishEventsForAggregate(savedAnnotationCard);
      if (publishAnnotationResult.isErr()) {
        console.error(
          'Failed to publish events for annotation card:',
          publishAnnotationResult.error,
        );
      }

      return ok({
        annotationCardId: savedAnnotationCard.cardId.getStringValue(),
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }

  private propagateLibraryError(
    error: Error,
  ):
    | AnnotationValidationError
    | AuthenticationError
    | AppError.UnexpectedError {
    if (error instanceof AuthenticationError) {
      return error;
    }
    if (error instanceof AppError.UnexpectedError) {
      return error;
    }
    return new AnnotationValidationError(error.message);
  }
}
