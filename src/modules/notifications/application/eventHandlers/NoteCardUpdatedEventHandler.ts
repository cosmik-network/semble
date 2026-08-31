import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { NoteCardUpdatedEvent } from '../../../cards/domain/events/NoteCardUpdatedEvent';
import { Result, ok } from '../../../../shared/core/Result';
import { ICardRepository } from '../../../cards/domain/ICardRepository';
import { NotificationService } from '../../domain/services/NotificationService';
import { MentionRecipientResolver } from '../services/MentionRecipientResolver';

/**
 * On note edit, re-parse the note for @handle mentions and reconcile mention
 * notifications: newly mentioned users are notified, unread notifications for
 * removed mentions are retracted.
 */
export class NoteCardUpdatedEventHandler implements IEventHandler<NoteCardUpdatedEvent> {
  constructor(
    private cardRepository: ICardRepository,
    private mentionRecipientResolver: MentionRecipientResolver,
    private notificationService: NotificationService,
  ) {}

  async handle(event: NoteCardUpdatedEvent): Promise<Result<void>> {
    try {
      const noteCardResult = await this.cardRepository.findById(event.cardId);
      if (noteCardResult.isErr() || !noteCardResult.value) return ok(undefined);
      const noteCard = noteCardResult.value;

      // Mention metadata is keyed on the parent URL card id
      const parentCardId = noteCard.parentCardId;
      if (!parentCardId) return ok(undefined);

      const text = noteCard.content.noteContent?.text ?? '';
      const recipients =
        await this.mentionRecipientResolver.resolveMentionedUsers(text);

      const reconcileResult =
        await this.notificationService.reconcileMentionNotifications(
          event.curatorId,
          { mentionSource: 'NOTE', cardId: parentCardId },
          recipients,
        );
      if (reconcileResult.isErr()) {
        console.error(
          'Failed to reconcile note mention notifications on update:',
          reconcileResult.error.message,
        );
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error handling NoteCardUpdatedEvent:', error);
      return ok(undefined);
    }
  }
}
