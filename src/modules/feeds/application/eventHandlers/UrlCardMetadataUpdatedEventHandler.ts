import { UrlCardMetadataUpdatedEvent } from '../../../cards/domain/events/UrlCardMetadataUpdatedEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok, err } from '../../../../shared/core/Result';
import { ICardRepository } from '../../../cards/domain/ICardRepository';
import { IFeedRepository } from '../../domain/IFeedRepository';

/**
 * Keeps the denormalized urlType on CARD_COLLECTED feed activities in sync
 * when a card's metadata is enriched after the activities were created.
 */
export class UrlCardMetadataUpdatedEventHandler implements IEventHandler<UrlCardMetadataUpdatedEvent> {
  constructor(
    private cardRepository: ICardRepository,
    private feedRepository: IFeedRepository,
  ) {}

  async handle(event: UrlCardMetadataUpdatedEvent): Promise<Result<void>> {
    const cardResult = await this.cardRepository.findById(event.cardId);
    if (cardResult.isErr()) {
      console.error(
        'Failed to find card for feed urlType update:',
        cardResult.error,
      );
      return err(cardResult.error);
    }

    const card = cardResult.value;
    const urlType = card?.content.urlContent?.metadata?.type;
    if (!card || !card.isUrlCard || !urlType) {
      return ok(undefined);
    }

    const updateResult = await this.feedRepository.updateUrlTypeByCardId(
      event.cardId.getStringValue(),
      urlType,
    );
    if (updateResult.isErr()) {
      console.error(
        'Failed to update feed activity urlType:',
        updateResult.error,
      );
      return err(updateResult.error);
    }

    return ok(undefined);
  }
}
