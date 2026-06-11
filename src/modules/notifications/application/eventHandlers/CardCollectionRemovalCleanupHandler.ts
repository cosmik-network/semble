import { CardRemovedFromCollectionEvent } from '../../../cards/domain/events/CardRemovedFromCollectionEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok, err } from '../../../../shared/core/Result';
import { INotificationRepository } from '../../domain/INotificationRepository';
import { NotificationType } from '@semble/types';

const COLLECTION_SCOPED_TYPES = new Set<string>([
  NotificationType.USER_ADDED_TO_YOUR_COLLECTION,
  NotificationType.USER_ADDED_CARD_TO_SUBSCRIBED_COLLECTION,
]);

/**
 * Delete collection-scoped notifications for a (card, collection) pair when
 * a card is removed from that collection. Covers both the collection author's
 * contribution notification and the collection subscriber notifications.
 *
 * Library-scoped subscription notifications (SUBSCRIBED_USER_ADDED_CARD)
 * remain — the card is still in the actor's library.
 */
export class CardCollectionRemovalCleanupHandler implements IEventHandler<CardRemovedFromCollectionEvent> {
  constructor(private notificationRepository: INotificationRepository) {}

  async handle(event: CardRemovedFromCollectionEvent): Promise<Result<void>> {
    try {
      const cardIdStr = event.cardId.getStringValue();
      const collectionIdStr = event.collectionId.getStringValue();

      const notificationsResult =
        await this.notificationRepository.findByCard(cardIdStr);
      if (notificationsResult.isErr()) return ok(undefined);

      for (const notification of notificationsResult.value) {
        if (!COLLECTION_SCOPED_TYPES.has(notification.type.value)) continue;
        if (!notification.metadata.collectionIds?.includes(collectionIdStr)) {
          continue;
        }

        const deleteResult = await this.notificationRepository.delete(
          notification.notificationId,
        );
        if (deleteResult.isErr()) {
          console.error(
            'CardCollectionRemovalCleanupHandler: failed to delete notification',
            deleteResult.error,
          );
        }
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error in CardCollectionRemovalCleanupHandler:', error);
      return err(error as Error);
    }
  }
}
