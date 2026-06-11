import { Result, ok } from '../../../../shared/core/Result';
import { ICardRepository } from '../../../cards/domain/ICardRepository';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { CreateNotificationUseCase } from '../useCases/commands/CreateNotificationUseCase';
import { NotificationType } from '@semble/types';
import {
  CardActivityBundle,
  ICardActivityBundleHandler,
} from './ICardActivityBundleHandler';

/**
 * If the card has a viaCardId, notify the via-card's curator that someone
 * added a card discovered via theirs. Skips if the actor is the via-card curator.
 */
export class ViaCardBundleHandler implements ICardActivityBundleHandler {
  constructor(
    private cardRepository: ICardRepository,
    private createNotificationUseCase: CreateNotificationUseCase,
  ) {}

  async handle(bundle: CardActivityBundle): Promise<Result<void>> {
    try {
      const cardIdResult = CardId.createFromString(bundle.cardId);
      if (cardIdResult.isErr()) return ok(undefined);

      const cardResult = await this.cardRepository.findById(cardIdResult.value);
      if (cardResult.isErr() || !cardResult.value) return ok(undefined);

      const card = cardResult.value;
      if (!card.viaCardId) return ok(undefined);

      const viaCardResult = await this.cardRepository.findById(card.viaCardId);
      if (viaCardResult.isErr() || !viaCardResult.value) return ok(undefined);

      const recipientUserId = viaCardResult.value.curatorId.value;
      if (recipientUserId === bundle.actorId) return ok(undefined);

      await this.createNotificationUseCase.execute({
        type: NotificationType.USER_ADDED_YOUR_CARD,
        recipientUserId,
        actorUserId: bundle.actorId,
        cardId: bundle.cardId,
        collectionIds:
          bundle.collectionIds.length > 0 ? bundle.collectionIds : undefined,
      });

      return ok(undefined);
    } catch (error) {
      console.error('Error in ViaCardBundleHandler:', error);
      return ok(undefined);
    }
  }
}
