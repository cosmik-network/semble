import { CardAddedToLibraryEvent } from '../../domain/events/CardAddedToLibraryEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok, err } from '../../../../shared/core/Result';
import { ICardRepository } from '../../domain/ICardRepository';
import { IMetadataService } from '../../domain/services/IMetadataService';
import { UrlMetadata } from '../../domain/value-objects/UrlMetadata';
import { UpdateUrlCardMetadataUseCase } from '../useCases/commands/UpdateUrlCardMetadataUseCase';

/**
 * Async metadata enrichment: cards are created with fast (Iframely-only)
 * metadata; this handler fetches the full (slow) metadata and, when it is an
 * improvement, updates the card via UpdateUrlCardMetadataUseCase.
 */
export class CardAddedToLibraryEventHandler implements IEventHandler<CardAddedToLibraryEvent> {
  constructor(
    private cardRepository: ICardRepository,
    private metadataService: IMetadataService,
    private updateUrlCardMetadataUseCase: UpdateUrlCardMetadataUseCase,
  ) {}

  async handle(event: CardAddedToLibraryEvent): Promise<Result<void>> {
    const cardResult = await this.cardRepository.findById(event.cardId);
    if (cardResult.isErr()) {
      console.error(
        'Failed to find card for metadata enrichment:',
        cardResult.error,
      );
      return err(cardResult.error);
    }

    const card = cardResult.value;
    if (!card || !card.isUrlCard || !card.url) {
      return ok(undefined);
    }

    // Full fetch; the fast pass already warmed the per-service caches
    const slowResult = await this.metadataService.fetchMetadata(
      card.url,
      true,
      'slow',
    );
    if (slowResult.isErr()) {
      // Return the error so BullMQ retries transient upstream failures
      console.error(
        `Slow metadata fetch failed for ${card.url.value}:`,
        slowResult.error,
      );
      return err(slowResult.error);
    }

    const currentMetadata = card.content.urlContent?.metadata;
    const { shouldUpdate, merged } = UrlMetadata.computeEnrichment(
      currentMetadata,
      slowResult.value,
    );
    if (!shouldUpdate) {
      return ok(undefined);
    }

    const updateResult = await this.updateUrlCardMetadataUseCase.execute({
      cardId: event.cardId.getStringValue(),
      metadata: merged,
    });
    if (updateResult.isErr()) {
      console.error(
        'Failed to update URL card metadata after enrichment:',
        updateResult.error,
      );
      return err(updateResult.error);
    }

    return ok(undefined);
  }
}
