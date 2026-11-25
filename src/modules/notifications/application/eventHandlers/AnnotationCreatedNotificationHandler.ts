import { CardAddedToLibraryEvent } from '../../../cards/domain/events/CardAddedToLibraryEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok } from '../../../../shared/core/Result';
import { ICardRepository } from '../../../cards/domain/ICardRepository';
import { ICardQueryRepository } from '../../../cards/domain/ICardQueryRepository';
import { NotificationService } from '../../domain/services/NotificationService';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { IDistributedLockService } from '../../../../shared/infrastructure/locking/IDistributedLockService';

/**
 * USER_ANNOTATED_YOUR_URL — when an annotation card is created, notify
 * everyone who has the annotated URL in their library. Annotations by the
 * same actor on the same URL within a time window collapse into one
 * notification per recipient (find-recent-and-merge under a distributed
 * lock, the same pattern feed activities use — no saga).
 *
 * Annotations saved via another card (viaCardId) are skipped here — the
 * via-card curator gets USER_ADDED_YOUR_CARD from ViaCardBundleHandler, and
 * that takes precedence.
 */
export class AnnotationCreatedNotificationHandler implements IEventHandler<CardAddedToLibraryEvent> {
  /** Batching window per (recipient, actor, url); overridable for tests */
  private readonly batchWindowMs: number;

  constructor(
    private cardRepository: ICardRepository,
    private cardQueryRepository: ICardQueryRepository,
    private notificationService: NotificationService,
    private distributedLockService: IDistributedLockService,
    batchWindowMs?: number,
  ) {
    this.batchWindowMs =
      batchWindowMs ??
      (Number(process.env.ANNOTATION_NOTIFICATION_BATCH_WINDOW_MS) ||
        20 * 60 * 1000);
  }

  async handle(event: CardAddedToLibraryEvent): Promise<Result<void>> {
    try {
      const cardResult = await this.cardRepository.findById(event.cardId);
      if (cardResult.isErr() || !cardResult.value) return ok(undefined);

      const card = cardResult.value;
      if (!card.isAnnotationCard) return ok(undefined);
      // Saving an annotation discovered via another card — USER_ADDED_YOUR_CARD
      // covers it and takes precedence
      if (card.viaCardId) return ok(undefined);
      if (!card.url) return ok(undefined);
      const url = card.url.value;

      const librariesResult = await this.cardQueryRepository.getLibrariesForUrl(
        url,
        {
          page: 1,
          limit: 1000,
          sortBy: 'CREATED_AT' as any,
          sortOrder: 'DESC' as any,
        },
      );
      if (!librariesResult.items) return ok(undefined);

      const recipientIds = librariesResult.items
        .map((library) => library.userId)
        .filter((userId) => userId !== event.curatorId.value);

      for (const recipientUserId of recipientIds) {
        const recipientIdResult = CuratorId.create(recipientUserId);
        if (recipientIdResult.isErr()) {
          console.error('Invalid recipient ID:', recipientIdResult.error);
          continue;
        }
        const recipientId = recipientIdResult.value;

        // Serialize batch appends per (recipient, actor, url) so concurrent
        // annotations merge into one notification instead of racing to create
        // two
        const lockKey = `notification:annotation-batch:${recipientUserId}:${event.curatorId.value}:${url}`;
        const notificationResult = await this.distributedLockService.withLock(
          lockKey,
          10000,
          () =>
            this.notificationService.createOrAppendUserAnnotatedYourUrlNotification(
              recipientId,
              event.curatorId,
              url,
              event.cardId,
              this.batchWindowMs,
            ),
        );

        if (notificationResult.isErr()) {
          console.error(
            'Failed to create annotation notification:',
            notificationResult.error,
          );
          // Continue with other recipients even if one fails
        }
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error in AnnotationCreatedNotificationHandler:', error);
      return ok(undefined);
    }
  }
}
