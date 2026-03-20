import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { ConnectionRemovedEvent } from '../../../cards/domain/events/ConnectionRemovedEvent';
import { Result, ok, err } from '../../../../shared/core/Result';
import { INotificationRepository } from '../../domain/INotificationRepository';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';

export class ConnectionRemovedEventHandler
  implements IEventHandler<ConnectionRemovedEvent>
{
  constructor(private notificationRepository: INotificationRepository) {}

  async handle(event: ConnectionRemovedEvent): Promise<Result<void>> {
    try {
      const actorUserId = CuratorId.create(event.curatorId.value);

      if (actorUserId.isErr()) {
        console.error('Invalid curator ID in ConnectionRemovedEvent');
        return ok(undefined);
      }

      // Find and delete any existing notifications for this connection/actor combination
      const existingNotificationsResult =
        await this.notificationRepository.findByConnectionAndActor(
          event.connectionId.getStringValue(),
          actorUserId.value,
        );

      if (existingNotificationsResult.isOk()) {
        const notifications = existingNotificationsResult.value;
        for (const notification of notifications) {
          const deleteResult = await this.notificationRepository.delete(
            notification.notificationId,
          );
          if (deleteResult.isErr()) {
            console.error('Failed to delete notification:', deleteResult.error);
            // Continue with other notifications even if one fails
          }
        }
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error handling ConnectionRemovedEvent:', error);
      return err(error as Error);
    }
  }
}
