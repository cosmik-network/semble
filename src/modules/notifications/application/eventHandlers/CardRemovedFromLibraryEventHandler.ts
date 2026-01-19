import { CardRemovedFromLibraryEvent } from '../../../cards/domain/events/CardRemovedFromLibraryEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result } from '../../../../shared/core/Result';
import { CardNotificationSaga } from '../sagas/CardNotificationSaga';

export class CardRemovedFromLibraryEventHandler
  implements IEventHandler<CardRemovedFromLibraryEvent>
{
  constructor(private cardNotificationSaga: CardNotificationSaga) {}

  async handle(event: CardRemovedFromLibraryEvent): Promise<Result<void>> {
    return this.cardNotificationSaga.handleCardEvent(event);
  }
}
