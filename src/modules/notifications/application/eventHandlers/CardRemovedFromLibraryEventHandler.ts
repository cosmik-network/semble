import { CardRemovedFromLibraryEvent } from '../../../cards/domain/events/CardRemovedFromLibraryEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok } from '../../../../shared/core/Result';
import { INotificationRepository } from '../../domain/INotificationRepository';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';

export class CardRemovedFromLibraryEventHandler
  implements IEventHandler<CardRemovedFromLibraryEvent>
{
  constructor(private notificationRepository: INotificationRepository) {}

  async handle(event: CardRemovedFromLibraryEvent): Promise<Result<void>> {
    try {
      const recipientId = CuratorId.create(event.curatorId.value);
      if (recipientId.isErr()) {
        console.error('Invalid curator ID in CardRemovedFromLibraryEvent:', event.curatorId.value);
        return ok(undefined);
      }

      // Find notifications for this card and recipient
      const notificationsResult = await this.notificationRepository.findByRecipient(
        recipientId.value,
        {
          page: 1,
          limit: 100, // Should be enough to find all notifications for a single card
          unreadOnly: false,
        }
      );

      if (notificationsResult.isErr()) {
        console.error('Failed to find notifications for card removal:', notificationsResult.error);
        return ok(undefined);
      }

      const { notifications } = notificationsResult.value;
      const cardId = event.cardId.getStringValue();

      // Filter notifications that match this card
      const notificationsToDelete = notifications.filter(
        notification => notification.metadata.cardId === cardId
      );

      // Delete matching notifications
      for (const notification of notificationsToDelete) {
        const deleteResult = await this.notificationRepository.delete(notification.notificationId);
        if (deleteResult.isErr()) {
          console.error('Failed to delete notification:', deleteResult.error);
          // Continue with other notifications even if one fails
        }
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error in CardRemovedFromLibraryEventHandler:', error);
      return ok(undefined);
    }
  }
}
