import { CardAddedToLibraryEvent } from '../../../cards/domain/events/CardAddedToLibraryEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result } from '../../../../shared/core/Result';
import { CardNotificationSaga } from '../sagas/CardNotificationSaga';

export class CardAddedToLibraryEventHandler
  implements IEventHandler<CardAddedToLibraryEvent>
{
  constructor(private cardNotificationSaga: CardNotificationSaga) {}

  async handle(event: CardAddedToLibraryEvent): Promise<Result<void>> {
    return this.cardNotificationSaga.handleCardEvent(event);
  }
}
