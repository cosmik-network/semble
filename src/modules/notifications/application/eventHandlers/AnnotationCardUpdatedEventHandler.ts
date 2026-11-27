import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { AnnotationCardUpdatedEvent } from '../../../cards/domain/events/AnnotationCardUpdatedEvent';
import { Result, ok } from '../../../../shared/core/Result';
import { ICardRepository } from '../../../cards/domain/ICardRepository';
import { NotificationService } from '../../domain/services/NotificationService';
import { MentionRecipientResolver } from '../services/MentionRecipientResolver';

/**
 * On annotation note edit, re-parse the note for @handle mentions and
 * reconcile mention notifications: newly mentioned users are notified,
 * unread notifications for removed mentions are retracted.
 */
export class AnnotationCardUpdatedEventHandler implements IEventHandler<AnnotationCardUpdatedEvent> {
  constructor(
    private cardRepository: ICardRepository,
    private mentionRecipientResolver: MentionRecipientResolver,
    private notificationService: NotificationService,
  ) {}

  async handle(event: AnnotationCardUpdatedEvent): Promise<Result<void>> {
    try {
      const cardResult = await this.cardRepository.findById(event.cardId);
      if (cardResult.isErr() || !cardResult.value) return ok(undefined);
      const card = cardResult.value;
      if (!card.isAnnotationCard) return ok(undefined);

      const text = card.content.annotationContent?.note ?? '';
      const recipients =
        await this.mentionRecipientResolver.resolveMentionedUsers(text);

      const reconcileResult =
        await this.notificationService.reconcileMentionNotifications(
          event.curatorId,
          { mentionSource: 'ANNOTATION', cardId: card.cardId },
          recipients,
        );
      if (reconcileResult.isErr()) {
        console.error(
          'Failed to reconcile annotation mention notifications on update:',
          reconcileResult.error.message,
        );
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error handling AnnotationCardUpdatedEvent:', error);
      return ok(undefined);
    }
  }
}
