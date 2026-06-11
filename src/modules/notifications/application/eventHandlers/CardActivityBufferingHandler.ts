import { CardAddedToLibraryEvent } from '../../../cards/domain/events/CardAddedToLibraryEvent';
import { CardAddedToCollectionEvent } from '../../../cards/domain/events/CardAddedToCollectionEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result } from '../../../../shared/core/Result';
import { CardActivityBundlingSaga } from '../sagas/CardActivityBundlingSaga';

/**
 * Forwards CardAddedToLibrary + CardAddedToCollection events into the
 * bundling saga. Single thin handler used for both event names.
 */
export class CardActivityBufferingHandler implements IEventHandler<
  CardAddedToLibraryEvent | CardAddedToCollectionEvent
> {
  constructor(private saga: CardActivityBundlingSaga) {}

  async handle(
    event: CardAddedToLibraryEvent | CardAddedToCollectionEvent,
  ): Promise<Result<void>> {
    return this.saga.handleCardEvent(event);
  }
}
