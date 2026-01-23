import { CardAddedToCollectionEvent } from '../../../cards/domain/events/CardAddedToCollectionEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok } from '../../../../shared/core/Result';
import { CreateNotificationUseCase } from '../useCases/commands/CreateNotificationUseCase';
import { ICollectionRepository } from '../../../cards/domain/ICollectionRepository';
import { CollectionAccessType } from '../../../cards/domain/Collection';
import { NotificationType } from '@semble/types';

export class CollectionContributionEventHandler
  implements IEventHandler<CardAddedToCollectionEvent>
{
  constructor(
    private createNotificationUseCase: CreateNotificationUseCase,
    private collectionRepository: ICollectionRepository,
  ) {}

  async handle(event: CardAddedToCollectionEvent): Promise<Result<void>> {
    try {
      // 1. Get collection to check access type and author
      const collectionResult = await this.collectionRepository.findById(
        event.collectionId,
      );
      if (collectionResult.isErr() || !collectionResult.value) {
        // Collection not found, skip notification
        return ok(undefined);
      }

      const collection = collectionResult.value;

      // 2. Only create notifications for OPEN collections
      if (collection.accessType !== CollectionAccessType.OPEN) {
        return ok(undefined);
      }

      // 3. Get recipient (collection author) and actor (who added the card)
      const recipientUserId = collection.authorId.value;
      const actorUserId = event.addedBy.value;

      // 4. Don't notify if collection owner is adding to their own collection
      if (recipientUserId === actorUserId) {
        return ok(undefined);
      }

      // 5. Create notification directly (no saga aggregation)
      const notificationResult =
        await this.createNotificationUseCase.execute({
          type: NotificationType.USER_ADDED_TO_YOUR_COLLECTION,
          recipientUserId,
          actorUserId,
          cardId: event.cardId.getStringValue(),
          collectionId: event.collectionId.getStringValue(),
        });

      if (notificationResult.isErr()) {
        console.error(
          'Failed to create collection contribution notification:',
          notificationResult.error,
        );
      }

      return ok(undefined);
    } catch (error) {
      console.error(
        'Error in CollectionContributionEventHandler:',
        error,
      );
      return ok(undefined); // Don't fail the event processing
    }
  }
}
