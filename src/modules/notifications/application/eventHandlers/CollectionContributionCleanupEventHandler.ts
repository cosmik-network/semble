import { CardRemovedFromCollectionEvent } from '../../../cards/domain/events/CardRemovedFromCollectionEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok } from '../../../../shared/core/Result';
import { INotificationRepository } from '../../domain/INotificationRepository';
import { ICollectionRepository } from '../../../cards/domain/ICollectionRepository';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';

export class CollectionContributionCleanupEventHandler
  implements IEventHandler<CardRemovedFromCollectionEvent>
{
  constructor(
    private notificationRepository: INotificationRepository,
    private collectionRepository: ICollectionRepository,
  ) {}

  async handle(event: CardRemovedFromCollectionEvent): Promise<Result<void>> {
    try {
      // 1. Get collection to determine the recipient (collection author)
      const collectionResult = await this.collectionRepository.findById(
        event.collectionId,
      );
      if (collectionResult.isErr() || !collectionResult.value) {
        // Collection not found, skip cleanup
        return ok(undefined);
      }

      const collection = collectionResult.value;
      const recipientUserId = collection.authorId.value;

      // 2. Find notifications for this card
      // Note: We query by card only, not by actor, because the notification actor
      // is the person who added the card (not necessarily who removed it)
      const notificationsResult = await this.notificationRepository.findByCard(
        event.cardId.getStringValue(),
      );

      if (notificationsResult.isErr()) {
        console.error(
          'Error fetching notifications for cleanup:',
          notificationsResult.error,
        );
        return ok(undefined);
      }

      const notifications = notificationsResult.value;

      // 4. Filter and delete matching notifications
      for (const notification of notifications) {
        // Check if this notification is USER_ADDED_TO_YOUR_COLLECTION type
        // and the recipient matches the collection author
        // and the collection ID is in the metadata
        if (
          notification.type.value === 'USER_ADDED_TO_YOUR_COLLECTION' &&
          notification.recipientUserId.value === recipientUserId &&
          notification.metadata.collectionIds?.includes(
            event.collectionId.getStringValue(),
          )
        ) {
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
      console.error(
        'Error in CollectionContributionCleanupEventHandler:',
        error,
      );
      return ok(undefined); // Don't fail the event processing
    }
  }
}
