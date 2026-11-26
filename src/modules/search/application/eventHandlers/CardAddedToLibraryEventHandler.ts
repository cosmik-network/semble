import { CardAddedToLibraryEvent } from '../../../cards/domain/events/CardAddedToLibraryEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok } from '../../../../shared/core/Result';
import { IndexUrlForSearchUseCase } from '../useCases/commands/IndexUrlForSearchUseCase';
import { IndexAnnotationForSearchUseCase } from '../useCases/commands/IndexAnnotationForSearchUseCase';
import { ICardRepository } from '../../../cards/domain/ICardRepository';

export class CardAddedToLibraryEventHandler implements IEventHandler<CardAddedToLibraryEvent> {
  constructor(
    private indexUrlForSearchUseCase: IndexUrlForSearchUseCase,
    private cardRepository: ICardRepository,
    private indexAnnotationForSearchUseCase?: IndexAnnotationForSearchUseCase,
  ) {}

  async handle(event: CardAddedToLibraryEvent): Promise<Result<void>> {
    // Get card details to check its type
    const cardResult = await this.cardRepository.findById(event.cardId);
    if (cardResult.isErr()) {
      console.error(
        'Failed to find card for search indexing:',
        cardResult.error,
      );
      return ok(undefined); // Don't fail the event processing
    }

    const card = cardResult.value;
    if (!card) {
      console.warn(
        'Card not found for search indexing:',
        event.cardId.getStringValue(),
      );
      return ok(undefined);
    }

    // Index URL cards
    if (card.isUrlCard && card.url) {
      const indexResult = await this.indexUrlForSearchUseCase.execute({
        url: card.url.value,
      });

      if (indexResult.isErr()) {
        console.error('Failed to index URL for search:', indexResult.error);
        // Don't fail the event processing - search indexing is not critical
      }

      return ok(undefined);
    }

    // Index annotation passages. Annotation creation always goes through a
    // library add, so this fires exactly once per card; the upsert is
    // idempotent across users highlighting the same passage.
    if (card.isAnnotationCard && card.url) {
      const selector = card.content.annotationContent?.textQuoteSelector;
      if (selector && this.indexAnnotationForSearchUseCase) {
        const indexResult = await this.indexAnnotationForSearchUseCase.execute({
          url: card.url.value,
          exact: selector.exact,
          exactNormalized: selector.normalizedExact,
        });

        if (indexResult.isErr()) {
          console.error(
            'Failed to index annotation for search:',
            indexResult.error,
          );
          // Don't fail the event processing - search indexing is not critical
        }
      }
    }

    return ok(undefined);
  }
}
