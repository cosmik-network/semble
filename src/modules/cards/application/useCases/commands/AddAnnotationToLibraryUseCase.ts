import { Result, ok, err } from '../../../../../shared/core/Result';
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';
import { ICardRepository } from '../../../domain/ICardRepository';
import {
  CardFactory,
  IAnnotationCardInput,
  IUrlCardInput,
} from '../../../domain/CardFactory';
import { CollectionId } from '../../../domain/value-objects/CollectionId';
import { CardId } from '../../../domain/value-objects/CardId';
import { CuratorId } from '../../../domain/value-objects/CuratorId';
import { IMetadataService } from '../../../domain/services/IMetadataService';
import { CardTypeEnum } from '../../../domain/value-objects/CardType';
import { URL } from '../../../domain/value-objects/URL';
import { CardLibraryService } from '../../../domain/services/CardLibraryService';
import { CardCollectionService } from '../../../domain/services/CardCollectionService';
import { PublishedRecordId } from '../../../domain/value-objects/PublishedRecordId';
import { AuthenticationError } from '../../../../../shared/core/AuthenticationError';
import { UrlMetadata } from 'src/modules/cards/domain/value-objects/UrlMetadata';
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
  urlCardId: string;
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
    private metadataService: IMetadataService,
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
      // before any side effects (annotation cards have no parentCardId, so
      // they don't depend on the URL card existing yet)
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

      // Ensure the source URL card exists in the curator's library — the
      // annotation anchors to it by (url, author), so the page must be saved
      let urlCard;
      const existingUrlCardResult =
        await this.cardRepository.findUsersUrlCardByUrl(url, curatorId);
      if (existingUrlCardResult.isErr()) {
        return err(
          AppError.UnexpectedError.create(existingUrlCardResult.error),
        );
      }

      urlCard = existingUrlCardResult.value;
      if (!urlCard) {
        // Interactive saves use fast mode; firehose-mirrored records take
        // the full slow fetch (mirrors AddUrlToLibraryUseCase)
        const fetchMode = request.publishedRecordId ? 'slow' : 'fast';
        const metadataResult = await this.metadataService.fetchMetadata(
          url,
          true,
          fetchMode,
        );
        let metadata: UrlMetadata;
        if (metadataResult.isOk()) {
          metadata = metadataResult.value;
        } else {
          metadata = UrlMetadata.create({ url: url.value }).unwrap();
        }

        const urlCardInput: IUrlCardInput = {
          type: CardTypeEnum.URL,
          url: url.value,
          metadata,
          viaCardId: request.viaCardId,
        };

        const urlCardResult = CardFactory.create({
          curatorId: request.curatorId,
          cardInput: urlCardInput,
          createdAt: request.timestamp,
        });
        if (urlCardResult.isErr()) {
          return err(
            new AnnotationValidationError(urlCardResult.error.message),
          );
        }
        urlCard = urlCardResult.value;
      }

      // Add the URL card to the curator's library if it isn't already. The
      // firehose record belongs to the annotation card, not the URL card
      // (unlike margin bookmarks, where the bookmark IS the URL card's
      // record), so at most skip publishing — never adopt the record id.
      if (!urlCard.isInLibrary(curatorId)) {
        const urlLibraryOptions = request.publishedRecordId
          ? { skipPublishing: true, timestamp: request.timestamp }
          : request.timestamp
            ? { timestamp: request.timestamp }
            : undefined;

        const addUrlResult = await this.cardLibraryService.addCardToLibrary(
          urlCard,
          curatorId,
          urlLibraryOptions,
        );
        if (addUrlResult.isErr()) {
          return err(this.propagateLibraryError(addUrlResult.error));
        }
        urlCard = addUrlResult.value;
      }

      // Add the annotation card to the library — publishes it as an
      // at.margin.note record via the card publisher. A firehose-provided
      // record id is the annotation's own record, so adopt it directly.
      const annotationLibraryOptions = request.publishedRecordId
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
          annotationLibraryOptions,
        );
      if (addAnnotationResult.isErr()) {
        return err(this.propagateLibraryError(addAnnotationResult.error));
      }
      const savedAnnotationCard = addAnnotationResult.value;

      // Handle collection additions if specified — the URL card is the
      // collection member, consistent with AddUrlToLibraryUseCase
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
            urlCard,
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

      // Publish events for both cards
      const publishUrlCardResult =
        await this.publishEventsForAggregate(urlCard);
      if (publishUrlCardResult.isErr()) {
        console.error(
          'Failed to publish events for URL card:',
          publishUrlCardResult.error,
        );
      }

      const publishAnnotationResult =
        await this.publishEventsForAggregate(savedAnnotationCard);
      if (publishAnnotationResult.isErr()) {
        console.error(
          'Failed to publish events for annotation card:',
          publishAnnotationResult.error,
        );
      }

      return ok({
        urlCardId: urlCard.cardId.getStringValue(),
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
