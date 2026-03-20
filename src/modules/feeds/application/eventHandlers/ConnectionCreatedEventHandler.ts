import { ConnectionCreatedEvent } from '../../../cards/domain/events/ConnectionCreatedEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok, err } from '../../../../shared/core/Result';
import { AddActivityToFeedUseCase } from '../useCases/commands/AddActivityToFeedUseCase';
import { ActivityTypeEnum } from '../../../feeds/domain/value-objects/ActivityType';

export class ConnectionCreatedEventHandler
  implements IEventHandler<ConnectionCreatedEvent>
{
  constructor(private addActivityToFeedUseCase: AddActivityToFeedUseCase) {}

  async handle(event: ConnectionCreatedEvent): Promise<Result<void>> {
    const result = await this.addActivityToFeedUseCase.execute({
      type: ActivityTypeEnum.CONNECTION_CREATED,
      actorId: event.curatorId.value,
      connectionId: event.connectionId.getStringValue(),
      createdAt: event.dateTimeOccurred,
    });

    if (result.isErr()) {
      console.error(
        'Failed to add connection created activity to feed:',
        result.error,
      );
      return err(result.error);
    }

    return ok(undefined);
  }
}
