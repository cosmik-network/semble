import { Result, ok } from '../../../../shared/core/Result';
import { IFollowsRepository } from '../../../user/domain/repositories/IFollowsRepository';
import { ICardRepository } from '../../../cards/domain/ICardRepository';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { FollowTargetType } from '../../../user/domain/value-objects/FollowTargetType';
import { CreateNotificationUseCase } from '../useCases/commands/CreateNotificationUseCase';
import { NotificationType } from '@semble/types';
import {
  CardActivityBundle,
  ICardActivityBundleHandler,
} from './ICardActivityBundleHandler';

/**
 * Fans out subscription notifications:
 * - Subscribers of the actor get SUBSCRIBED_USER_ADDED_CARD.
 * - For each collection in the bundle, subscribers of that collection get
 *   USER_ADDED_CARD_TO_SUBSCRIBED_COLLECTION.
 *
 * Dedupe: a recipient subscribed to both the actor and a collection involved
 * in the bundle receives only the collection-scoped notification (more specific).
 * Excludes the actor and the via-card curator.
 */
export class SubscriptionBundleHandler implements ICardActivityBundleHandler {
  constructor(
    private followsRepository: IFollowsRepository,
    private cardRepository: ICardRepository,
    private createNotificationUseCase: CreateNotificationUseCase,
  ) {}

  async handle(bundle: CardActivityBundle): Promise<Result<void>> {
    try {
      const excluded = await this.buildExclusions(bundle);

      // Collection-scoped notifications first so we can mark recipients
      // as handled before processing user-scoped subscribers.
      const collectionRecipients = new Set<string>();

      for (const collectionIdStr of bundle.collectionIds) {
        const subs = await this.followsRepository.getSubscribers(
          collectionIdStr,
          FollowTargetType.COLLECTION,
        );
        if (subs.isErr()) continue;
        for (const follow of subs.value) {
          const recipientId = follow.followerId.value;
          if (excluded.has(recipientId)) continue;
          collectionRecipients.add(recipientId);
          await this.createNotificationUseCase.execute({
            type: NotificationType.USER_ADDED_CARD_TO_SUBSCRIBED_COLLECTION,
            recipientUserId: recipientId,
            actorUserId: bundle.actorId,
            cardId: bundle.cardId,
            collectionIds: bundle.collectionIds,
          });
        }
      }

      const userSubs = await this.followsRepository.getSubscribers(
        bundle.actorId,
        FollowTargetType.USER,
      );
      if (userSubs.isOk()) {
        for (const follow of userSubs.value) {
          const recipientId = follow.followerId.value;
          if (excluded.has(recipientId)) continue;
          if (collectionRecipients.has(recipientId)) continue;
          await this.createNotificationUseCase.execute({
            type: NotificationType.SUBSCRIBED_USER_ADDED_CARD,
            recipientUserId: recipientId,
            actorUserId: bundle.actorId,
            cardId: bundle.cardId,
            collectionIds:
              bundle.collectionIds.length > 0
                ? bundle.collectionIds
                : undefined,
          });
        }
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error in SubscriptionBundleHandler:', error);
      return ok(undefined);
    }
  }

  private async buildExclusions(
    bundle: CardActivityBundle,
  ): Promise<Set<string>> {
    const excluded = new Set<string>([bundle.actorId]);

    const cardIdResult = CardId.createFromString(bundle.cardId);
    if (cardIdResult.isErr()) return excluded;

    const cardResult = await this.cardRepository.findById(cardIdResult.value);
    if (cardResult.isOk() && cardResult.value && cardResult.value.viaCardId) {
      const viaCardResult = await this.cardRepository.findById(
        cardResult.value.viaCardId,
      );
      if (viaCardResult.isOk() && viaCardResult.value) {
        excluded.add(viaCardResult.value.curatorId.value);
      }
    }

    return excluded;
  }
}
