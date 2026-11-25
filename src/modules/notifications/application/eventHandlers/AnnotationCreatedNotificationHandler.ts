import { CardAddedToLibraryEvent } from '../../../cards/domain/events/CardAddedToLibraryEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok } from '../../../../shared/core/Result';
import { ICardRepository } from '../../../cards/domain/ICardRepository';
import { ICardQueryRepository } from '../../../cards/domain/ICardQueryRepository';
import { IFollowsRepository } from '../../../user/domain/repositories/IFollowsRepository';
import { FollowTargetType } from '../../../user/domain/value-objects/FollowTargetType';
import { SubscriptionScopeEnum } from '../../../user/domain/value-objects/SubscriptionScope';
import { NotificationService } from '../../domain/services/NotificationService';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { IDistributedLockService } from '../../../../shared/infrastructure/locking/IDistributedLockService';

/**
 * Batched annotation notifications, fired when an annotation card is added
 * to a library:
 * - USER_ANNOTATED_YOUR_URL to everyone who has the annotated URL in their
 *   library (specific).
 * - SUBSCRIBED_USER_ANNOTATED_URL to the actor's USER followers with CARD
 *   scope (generic) — except anyone already getting the specific one, the
 *   same specific-over-generic precedence USER_ADDED_YOUR_CARD has over
 *   SUBSCRIBED_USER_ADDED_CARD.
 *
 * Annotations by the same actor on the same URL within a time window
 * collapse into one notification per recipient and type
 * (find-recent-and-merge under a distributed lock, the same pattern feed
 * activities use — no saga).
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
    private followsRepository: IFollowsRepository,
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

      // Specific recipients: the URL is in their library
      const librariesResult = await this.cardQueryRepository.getLibrariesForUrl(
        url,
        {
          page: 1,
          limit: 1000,
          sortBy: 'CREATED_AT' as any,
          sortOrder: 'DESC' as any,
        },
      );

      const specificRecipientIds = new Set(
        (librariesResult.items ?? [])
          .map((library) => library.userId)
          .filter((userId) => userId !== event.curatorId.value),
      );

      // Generic recipients: the actor's CARD-scope USER subscribers, minus
      // the specific ones (they already get USER_ANNOTATED_YOUR_URL)
      const subscriberIds = new Set<string>();
      const subs = await this.followsRepository.getSubscribersForScope(
        event.curatorId.value,
        FollowTargetType.USER,
        SubscriptionScopeEnum.CARD,
      );
      if (subs.isOk()) {
        for (const follow of subs.value) {
          const recipientId = follow.followerId.value;
          if (recipientId === event.curatorId.value) continue;
          if (specificRecipientIds.has(recipientId)) continue;
          subscriberIds.add(recipientId);
        }
      }

      for (const recipientUserId of specificRecipientIds) {
        await this.createBatched(
          event,
          recipientUserId,
          url,
          'USER_ANNOTATED_YOUR_URL',
        );
      }
      for (const recipientUserId of subscriberIds) {
        await this.createBatched(
          event,
          recipientUserId,
          url,
          'SUBSCRIBED_USER_ANNOTATED_URL',
        );
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error in AnnotationCreatedNotificationHandler:', error);
      return ok(undefined);
    }
  }

  private async createBatched(
    event: CardAddedToLibraryEvent,
    recipientUserId: string,
    url: string,
    type: 'USER_ANNOTATED_YOUR_URL' | 'SUBSCRIBED_USER_ANNOTATED_URL',
  ): Promise<void> {
    const recipientIdResult = CuratorId.create(recipientUserId);
    if (recipientIdResult.isErr()) {
      console.error('Invalid recipient ID:', recipientIdResult.error);
      return;
    }

    // Serialize batch appends per (recipient, actor, url, type) so concurrent
    // annotations merge into one notification instead of racing to create two
    const lockKey = `notification:annotation-batch:${type}:${recipientUserId}:${event.curatorId.value}:${url}`;
    const notificationResult = await this.distributedLockService.withLock(
      lockKey,
      10000,
      () =>
        this.notificationService.createOrAppendUserAnnotatedYourUrlNotification(
          recipientIdResult.value,
          event.curatorId,
          url,
          event.cardId,
          this.batchWindowMs,
          type,
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
}
