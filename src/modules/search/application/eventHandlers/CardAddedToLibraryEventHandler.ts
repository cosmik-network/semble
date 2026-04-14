import { CardAddedToLibraryEvent } from '../../../cards/domain/events/CardAddedToLibraryEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok } from '../../../../shared/core/Result';
import { IndexUrlForSearchUseCase } from '../useCases/commands/IndexUrlForSearchUseCase';
import { ICardRepository } from '../../../cards/domain/ICardRepository';

export class CardAddedToLibraryEventHandler
  implements IEventHandler<CardAddedToLibraryEvent>
{
  constructor(
    private indexUrlForSearchUseCase: IndexUrlForSearchUseCase,
    private cardRepository: ICardRepository,
  ) {}

  async handle(event: CardAddedToLibraryEvent): Promise<Result<void>> {
    // Get card details to check if it's a URL card
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

    // Only index URL cards
    if (!card.isUrlCard || !card.url) {
      return ok(undefined);
    }

    // Index the URL for search
    const indexResult = await this.indexUrlForSearchUseCase.execute({
      url: card.url.value,
    });

    if (indexResult.isErr()) {
      console.error('Failed to index URL for search:', indexResult.error);
      // Don't fail the event processing - search indexing is not critical
    }

    return ok(undefined);
  }
}
