import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { CollectionCreatedEvent } from '../../../cards/domain/events/CollectionCreatedEvent';
import { CollectionUpdatedEvent } from '../../../cards/domain/events/CollectionUpdatedEvent';
import { Result, ok } from '../../../../shared/core/Result';
import { ICollectionRepository } from '../../../cards/domain/ICollectionRepository';
import { NotificationService } from '../../domain/services/NotificationService';
import { MentionRecipientResolver } from '../services/MentionRecipientResolver';

/**
 * Handles @handle mentions in collection descriptions, for both collection
 * creation and updates. Loads the collection to read the current description
 * (the events carry only ids) and reconciles mention notifications.
 */
export class CollectionMentionEventHandler implements IEventHandler<
  CollectionCreatedEvent | CollectionUpdatedEvent
> {
  constructor(
    private collectionRepository: ICollectionRepository,
    private mentionRecipientResolver: MentionRecipientResolver,
    private notificationService: NotificationService,
  ) {}

  async handle(
    event: CollectionCreatedEvent | CollectionUpdatedEvent,
  ): Promise<Result<void>> {
    try {
      const collectionResult = await this.collectionRepository.findById(
        event.collectionId,
      );
      if (collectionResult.isErr() || !collectionResult.value) {
        return ok(undefined);
      }
      const collection = collectionResult.value;

      const text = collection.description?.value ?? '';
      const recipients =
        await this.mentionRecipientResolver.resolveMentionedUsers(text);

      const reconcileResult =
        await this.notificationService.reconcileMentionNotifications(
          event.authorId,
          { mentionSource: 'COLLECTION', collectionId: event.collectionId },
          recipients,
        );
      if (reconcileResult.isErr()) {
        console.error(
          'Failed to reconcile collection mention notifications:',
          reconcileResult.error.message,
        );
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error handling collection mention event:', error);
      return ok(undefined);
    }
  }
}
