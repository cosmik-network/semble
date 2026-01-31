import { CardAddedToLibraryEvent } from '../../../cards/domain/events/CardAddedToLibraryEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result } from '../../../../shared/core/Result';
import { SyncAccountDataUseCase } from '../useCases/SyncAccountDataUseCase';

export class CardAddedToLibraryEventHandler
  implements IEventHandler<CardAddedToLibraryEvent>
{
  constructor(private syncAccountDataUseCase: SyncAccountDataUseCase) {}

  async handle(event: CardAddedToLibraryEvent): Promise<Result<void>> {
    console.log(
      `[SYNC] Handling CardAddedToLibraryEvent for curator: ${event.curatorId.value}`,
    );

    // Pass the curator ID from the event to the sync use case
    return this.syncAccountDataUseCase.execute({
      curatorId: event.curatorId.value,
      cardId: event.cardId.getStringValue(),
    });
  }
}
