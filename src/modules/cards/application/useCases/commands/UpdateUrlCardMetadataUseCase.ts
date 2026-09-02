import { Result, ok, err } from '../../../../../shared/core/Result';
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { UseCaseError } from '../../../../../shared/core/UseCaseError';
import { AppError } from '../../../../../shared/core/AppError';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';
import { ICardRepository } from '../../../domain/ICardRepository';
import { ICardPublisher } from '../../ports/ICardPublisher';
import { CardId } from '../../../domain/value-objects/CardId';
import { UrlMetadata } from '../../../domain/value-objects/UrlMetadata';

export interface UpdateUrlCardMetadataDTO {
  cardId: string;
  metadata: UrlMetadata;
}

export interface UpdateUrlCardMetadataResponseDTO {
  cardId: string;
  republishedToPds: boolean;
}

export class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Replaces a URL card's metadata with an enriched version (from the async
 * slow metadata fetch), persists it, and best-effort republishes the card
 * record to the creator's PDS. A PDS failure (e.g. expired OAuth session)
 * never fails the use case — the DB stays the source of truth and the error
 * is logged.
 */
export class UpdateUrlCardMetadataUseCase extends BaseUseCase<
  UpdateUrlCardMetadataDTO,
  Result<
    UpdateUrlCardMetadataResponseDTO,
    ValidationError | AppError.UnexpectedError
  >
> {
  constructor(
    private cardRepository: ICardRepository,
    private cardPublisher: ICardPublisher,
    eventPublisher: IEventPublisher,
  ) {
    super(eventPublisher);
  }

  async execute(
    request: UpdateUrlCardMetadataDTO,
  ): Promise<
    Result<
      UpdateUrlCardMetadataResponseDTO,
      ValidationError | AppError.UnexpectedError
    >
  > {
    try {
      const cardIdResult = CardId.createFromString(request.cardId);
      if (cardIdResult.isErr()) {
        return err(
          new ValidationError(`Invalid card ID: ${cardIdResult.error.message}`),
        );
      }

      const cardResult = await this.cardRepository.findById(cardIdResult.value);
      if (cardResult.isErr()) {
        return err(AppError.UnexpectedError.create(cardResult.error));
      }
      const card = cardResult.value;
      if (!card) {
        return err(new ValidationError('Card not found'));
      }
      if (!card.isUrlCard) {
        return err(new ValidationError('Card is not a URL card'));
      }

      const updateResult = card.updateUrlMetadata(request.metadata);
      if (updateResult.isErr()) {
        return err(new ValidationError(updateResult.error.message));
      }

      const saveResult = await this.cardRepository.save(card);
      if (saveResult.isErr()) {
        return err(AppError.UnexpectedError.create(saveResult.error));
      }

      // Best-effort PDS republish so the AT Protocol record reflects the
      // enriched metadata. Only for records this app published (skip
      // firehose-mirrored Margin records — putRecord would write them into
      // the wrong collection).
      let republishedToPds = false;
      const creatorMembership = card.getLibraryInfo(card.curatorId);
      const publishedUri = creatorMembership?.publishedRecordId?.getValue().uri;
      if (publishedUri && !publishedUri.includes('/at.margin.')) {
        const publishResult = await this.cardPublisher.publishCardToLibrary(
          card,
          card.curatorId,
        );
        if (publishResult.isErr()) {
          console.error(
            `Failed to republish card ${request.cardId} to PDS after metadata update (DB updated anyway):`,
            publishResult.error,
          );
        } else {
          republishedToPds = true;
          // putRecord yields a new CID — record it so the stored published
          // record matches what's on the PDS.
          card.markCardInLibraryAsPublished(
            card.curatorId,
            publishResult.value,
          );
          const resaveResult = await this.cardRepository.save(card);
          if (resaveResult.isErr()) {
            console.error(
              `Failed to persist new published record CID for card ${request.cardId}:`,
              resaveResult.error,
            );
          }
        }
      }

      const publishEventsResult = await this.publishEventsForAggregate(card);
      if (publishEventsResult.isErr()) {
        console.error(
          'Failed to publish events for URL card metadata update:',
          publishEventsResult.error,
        );
        // Don't fail the operation if event publishing fails
      }

      return ok({ cardId: request.cardId, republishedToPds });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
