import { Result, ok } from '../../../../shared/core/Result';
import { ICardRepository } from '../../../cards/domain/ICardRepository';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { NotificationService } from '../../domain/services/NotificationService';
import { MentionRecipientResolver } from '../services/MentionRecipientResolver';
import {
  CardActivityBundle,
  ICardActivityBundleHandler,
} from './ICardActivityBundleHandler';

/**
 * When a card is added with a note, parse the note text for @handle mentions
 * and notify mentioned Semble users.
 *
 * The bundle only carries the URL card's id (the note card's library event is
 * not published by AddUrlToLibraryUseCase), so the actor's note is
 * reverse-looked-up by URL. Mention metadata stores the parent URL card id —
 * that's what the notification UI renders and what the note-updated handler
 * reconciles against.
 */
export class NoteMentionBundleHandler implements ICardActivityBundleHandler {
  constructor(
    private cardRepository: ICardRepository,
    private mentionRecipientResolver: MentionRecipientResolver,
    private notificationService: NotificationService,
  ) {}

  async handle(bundle: CardActivityBundle): Promise<Result<void>> {
    try {
      const cardIdResult = CardId.createFromString(bundle.cardId);
      if (cardIdResult.isErr()) return ok(undefined);

      const actorIdResult = CuratorId.create(bundle.actorId);
      if (actorIdResult.isErr()) return ok(undefined);
      const actorId = actorIdResult.value;

      const cardResult = await this.cardRepository.findById(cardIdResult.value);
      if (cardResult.isErr() || !cardResult.value) return ok(undefined);
      const card = cardResult.value;
      if (!card.url) return ok(undefined);

      const noteCardResult = await this.cardRepository.findUsersNoteCardByUrl(
        card.url,
        actorId,
      );
      if (noteCardResult.isErr() || !noteCardResult.value) return ok(undefined);
      const noteCard = noteCardResult.value;

      const text = noteCard.content.noteContent?.text;
      if (!text) return ok(undefined);

      const recipients =
        await this.mentionRecipientResolver.resolveMentionedUsers(text);
      if (recipients.length === 0) return ok(undefined);

      const reconcileResult =
        await this.notificationService.reconcileMentionNotifications(
          actorId,
          { mentionSource: 'NOTE', cardId: card.cardId },
          recipients,
        );
      if (reconcileResult.isErr()) {
        console.error(
          'Failed to reconcile note mention notifications:',
          reconcileResult.error.message,
        );
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error in NoteMentionBundleHandler:', error);
      return ok(undefined);
    }
  }
}
