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

  async handle(
    event: CardRemovedFromCollectionEvent,
  ): Promise<Result<void>> {
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
      const actorUserId = event.removedBy.value;

      // 2. Create CuratorId for actor
      const actorIdResult = CuratorId.create(actorUserId);
      if (actorIdResult.isErr()) {
        console.error('Invalid curator ID in CardRemovedFromCollectionEvent');
        return ok(undefined);
      }

      // 3. Find notifications for this card/actor combination
      // Note: findByCardAndActor returns all notifications for this card/actor
      // We need to filter for USER_ADDED_TO_YOUR_COLLECTION type and matching collection
      const notificationsResult =
        await this.notificationRepository.findByCardAndActor(
          event.cardId.getStringValue(),
          actorIdResult.value,
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
            console.error(
              'Failed to delete notification:',
              deleteResult.error,
            );
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
