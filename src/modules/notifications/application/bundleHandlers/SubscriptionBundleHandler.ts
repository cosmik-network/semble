import { Result, ok } from '../../../../shared/core/Result';
import { IFollowsRepository } from '../../../user/domain/repositories/IFollowsRepository';
import { ICardRepository } from '../../../cards/domain/ICardRepository';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { FollowTargetType } from '../../../user/domain/value-objects/FollowTargetType';
import { SubscriptionScopeEnum } from '../../../user/domain/value-objects/SubscriptionScope';
import { CreateNotificationUseCase } from '../useCases/commands/CreateNotificationUseCase';
import { NotificationType } from '@semble/types';
import { CollectionUrlResolver } from '../services/CollectionUrlResolver';
import {
  CardActivityBundle,
  ICardActivityBundleHandler,
} from './ICardActivityBundleHandler';

/**
 * Fans out subscription notifications, scoped:
 * - COLLECTION subscribers with CARD scope on each collection in the bundle
 *   → USER_ADDED_CARD_TO_SUBSCRIBED_COLLECTION.
 * - COLLECTION subscribers with COLLECTION_SAVED scope when the bundle's card
 *   URL resolves to a Semble collection (someone saved that collection's link)
 *   → USER_ADDED_SUBSCRIBED_COLLECTION.
 * - USER subscribers with CARD scope on the actor → SUBSCRIBED_USER_ADDED_CARD.
 *
 * Dedup precedence per recipient: collection-CARD > COLLECTION_SAVED > user-CARD.
 * Excludes actor + via-card curator.
 */
export class SubscriptionBundleHandler implements ICardActivityBundleHandler {
  constructor(
    private followsRepository: IFollowsRepository,
    private cardRepository: ICardRepository,
    private createNotificationUseCase: CreateNotificationUseCase,
    private collectionUrlResolver: CollectionUrlResolver,
  ) {}

  async handle(bundle: CardActivityBundle): Promise<Result<void>> {
    try {
      const excluded = await this.buildExclusions(bundle);
      const handledRecipients = new Set<string>();

      // 1. Collection-CARD scope (highest specificity).
      for (const collectionIdStr of bundle.collectionIds) {
        const subs = await this.followsRepository.getSubscribersForScope(
          collectionIdStr,
          FollowTargetType.COLLECTION,
          SubscriptionScopeEnum.CARD,
        );
        if (subs.isErr()) continue;
        for (const follow of subs.value) {
          const recipientId = follow.followerId.value;
          if (excluded.has(recipientId)) continue;
          if (handledRecipients.has(recipientId)) continue;
          handledRecipients.add(recipientId);
          await this.createNotificationUseCase.execute({
            type: NotificationType.USER_ADDED_CARD_TO_SUBSCRIBED_COLLECTION,
            recipientUserId: recipientId,
            actorUserId: bundle.actorId,
            cardId: bundle.cardId,
            collectionIds: bundle.collectionIds,
          });
        }
      }

      // 2. COLLECTION_SAVED scope — only if the bundle has a library event and
      //    the card's URL points to a Semble collection.
      if (bundle.hasLibraryEvent) {
        const resolved = await this.resolveCardUrlToCollection(bundle.cardId);
        if (resolved) {
          // Exclude the collection author from their own collection-saved alert.
          const localExcluded = new Set(excluded);
          localExcluded.add(resolved.authorDid);

          const subs = await this.followsRepository.getSubscribersForScope(
            resolved.collectionId,
            FollowTargetType.COLLECTION,
            SubscriptionScopeEnum.COLLECTION_SAVED,
          );
          if (subs.isOk()) {
            for (const follow of subs.value) {
              const recipientId = follow.followerId.value;
              if (localExcluded.has(recipientId)) continue;
              if (handledRecipients.has(recipientId)) continue;
              handledRecipients.add(recipientId);
              await this.createNotificationUseCase.execute({
                type: NotificationType.USER_ADDED_SUBSCRIBED_COLLECTION,
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
        }
      }

      // 3. User-CARD scope (lowest specificity).
      const userSubs = await this.followsRepository.getSubscribersForScope(
        bundle.actorId,
        FollowTargetType.USER,
        SubscriptionScopeEnum.CARD,
      );
      if (userSubs.isOk()) {
        for (const follow of userSubs.value) {
          const recipientId = follow.followerId.value;
          if (excluded.has(recipientId)) continue;
          if (handledRecipients.has(recipientId)) continue;
          handledRecipients.add(recipientId);
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

  private async resolveCardUrlToCollection(cardId: string) {
    const cardIdResult = CardId.createFromString(cardId);
    if (cardIdResult.isErr()) return null;
    const cardResult = await this.cardRepository.findById(cardIdResult.value);
    if (cardResult.isErr() || !cardResult.value) return null;
    const url = cardResult.value.url;
    if (!url) return null;
    return this.collectionUrlResolver.resolve(url.toString());
  }
}
