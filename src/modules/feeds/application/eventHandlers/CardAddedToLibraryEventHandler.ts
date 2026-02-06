import { CardAddedToLibraryEvent } from '../../../cards/domain/events/CardAddedToLibraryEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok, err } from '../../../../shared/core/Result';
import { AddActivityToFeedUseCase } from '../useCases/commands/AddActivityToFeedUseCase';
import { ActivityTypeEnum } from '../../../feeds/domain/value-objects/ActivityType';

export class CardAddedToLibraryEventHandler
  implements IEventHandler<CardAddedToLibraryEvent>
{
  constructor(private addActivityToFeedUseCase: AddActivityToFeedUseCase) {}

  async handle(event: CardAddedToLibraryEvent): Promise<Result<void>> {
    const result = await this.addActivityToFeedUseCase.execute({
      type: ActivityTypeEnum.CARD_COLLECTED,
      actorId: event.curatorId.value,
      cardId: event.cardId.getStringValue(),
      collectionIds: undefined, // Library event has no collections
      createdAt: event.addedAt,
    });

    if (result.isErr()) {
      console.error('Failed to add library activity to feed:', result.error);
      return err(result.error);
    }

    return ok(undefined);
  }
}
