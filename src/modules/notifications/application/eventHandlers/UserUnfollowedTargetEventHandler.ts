import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { UserUnfollowedTargetEvent } from '../../../user/domain/events/UserUnfollowedTargetEvent';
import { Result, ok, err } from '../../../../shared/core/Result';
import { INotificationRepository } from '../../domain/INotificationRepository';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';

export class UserUnfollowedTargetEventHandler
  implements IEventHandler<UserUnfollowedTargetEvent>
{
  constructor(private notificationRepository: INotificationRepository) {}

  async handle(event: UserUnfollowedTargetEvent): Promise<Result<void>> {
    try {
      const actorIdResult = CuratorId.create(event.followerId.value);
      if (actorIdResult.isErr()) {
        console.error('Invalid follower ID:', actorIdResult.error);
        return err(actorIdResult.error);
      }
      const actorId = actorIdResult.value;

      // Find all follow notifications for this follower/target combination
      const notificationsResult =
        await this.notificationRepository.findFollowNotificationsByActorAndTarget(
          actorId,
          event.targetId,
          event.targetType.value as 'USER' | 'COLLECTION',
        );

      if (notificationsResult.isErr()) {
        console.error(
          'Failed to find follow notifications:',
          notificationsResult.error,
        );
        return err(notificationsResult.error);
      }

      const notifications = notificationsResult.value;

      // Delete all found notifications
      for (const notification of notifications) {
        const deleteResult = await this.notificationRepository.delete(
          notification.notificationId,
        );

        if (deleteResult.isErr()) {
          console.error(
            'Failed to delete notification:',
            notification.notificationId.getStringValue(),
            deleteResult.error,
          );
          // Continue with other notifications even if one fails
        }
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error handling UserUnfollowedTargetEvent:', error);
      return err(error as Error);
    }
  }
}
