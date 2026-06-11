import { CardRemovedFromLibraryEvent } from '../../../cards/domain/events/CardRemovedFromLibraryEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok, err } from '../../../../shared/core/Result';
import { INotificationRepository } from '../../domain/INotificationRepository';
import { CardActivityBundlingSaga } from '../sagas/CardActivityBundlingSaga';

/**
 * When a card is removed from the actor's library entirely, drop:
 *  - any pending bundle in the saga (no notifications were written yet), and
 *  - all notifications already written keyed by (cardId, actorId).
 *
 * That covers via-card, URL-mention, and subscription notifications — all
 * three policies stem from the actor's library action.
 */
export class CardLibraryRemovalCleanupHandler implements IEventHandler<CardRemovedFromLibraryEvent> {
  constructor(
    private notificationRepository: INotificationRepository,
    private bundlingSaga: CardActivityBundlingSaga,
  ) {}

  async handle(event: CardRemovedFromLibraryEvent): Promise<Result<void>> {
    try {
      const cardIdStr = event.cardId.getStringValue();
      const actorIdStr = event.curatorId.value;

      await this.bundlingSaga.cancelPending(cardIdStr, actorIdStr);

      const notificationsResult =
        await this.notificationRepository.findByCardAndActor(
          cardIdStr,
          event.curatorId,
        );
      if (notificationsResult.isErr()) return ok(undefined);

      for (const notification of notificationsResult.value) {
        const deleteResult = await this.notificationRepository.delete(
          notification.notificationId,
        );
        if (deleteResult.isErr()) {
          console.error(
            'CardLibraryRemovalCleanupHandler: failed to delete notification',
            deleteResult.error,
          );
        }
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error in CardLibraryRemovalCleanupHandler:', error);
      return err(error as Error);
    }
  }
}
