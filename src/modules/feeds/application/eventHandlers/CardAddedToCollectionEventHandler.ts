import { CardAddedToCollectionEvent } from '../../../cards/domain/events/CardAddedToCollectionEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok, err } from '../../../../shared/core/Result';
import { AddActivityToFeedUseCase } from '../useCases/commands/AddActivityToFeedUseCase';
import { ActivityTypeEnum } from '../../../feeds/domain/value-objects/ActivityType';

export class CardAddedToCollectionEventHandler
  implements IEventHandler<CardAddedToCollectionEvent>
{
  constructor(private addActivityToFeedUseCase: AddActivityToFeedUseCase) {}

  async handle(event: CardAddedToCollectionEvent): Promise<Result<void>> {
    const result = await this.addActivityToFeedUseCase.execute({
      type: ActivityTypeEnum.CARD_COLLECTED,
      actorId: event.addedBy.value,
      cardId: event.cardId.getStringValue(),
      collectionIds: [event.collectionId.getStringValue()],
      createdAt: event.addedAt,
    });

    if (result.isErr()) {
      console.error('Failed to add collection activity to feed:', result.error);
      return err(result.error);
    }

    return ok(undefined);
  }
}
