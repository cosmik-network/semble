import { CardAddedToCollectionEvent } from '../../../cards/domain/events/CardAddedToCollectionEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result } from '../../../../shared/core/Result';
import { CardNotificationSaga } from '../sagas/CardNotificationSaga';

export class CardAddedToCollectionEventHandler
  implements IEventHandler<CardAddedToCollectionEvent>
{
  constructor(private cardNotificationSaga: CardNotificationSaga) {}

  async handle(event: CardAddedToCollectionEvent): Promise<Result<void>> {
    return this.cardNotificationSaga.handleCardEvent(event);
  }
}
