import { Result, ok } from '../../../../shared/core/Result';
import { ICollectionRepository } from '../../../cards/domain/ICollectionRepository';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';
import { CollectionAccessType } from '../../../cards/domain/Collection';
import { CreateNotificationUseCase } from '../useCases/commands/CreateNotificationUseCase';
import { NotificationType } from '@semble/types';
import {
  CardActivityBundle,
  ICardActivityBundleHandler,
} from './ICardActivityBundleHandler';

/**
 * For each OPEN collection in the bundle, notify the collection author that
 * a contributor added a card. Skips collections owned by the actor.
 */
export class CollectionContributionBundleHandler implements ICardActivityBundleHandler {
  constructor(
    private collectionRepository: ICollectionRepository,
    private createNotificationUseCase: CreateNotificationUseCase,
  ) {}

  async handle(bundle: CardActivityBundle): Promise<Result<void>> {
    try {
      if (bundle.collectionIds.length === 0) return ok(undefined);

      for (const collectionIdStr of bundle.collectionIds) {
        const collectionIdResult =
          CollectionId.createFromString(collectionIdStr);
        if (collectionIdResult.isErr()) continue;

        const collectionResult = await this.collectionRepository.findById(
          collectionIdResult.value,
        );
        if (collectionResult.isErr() || !collectionResult.value) continue;

        const collection = collectionResult.value;
        if (collection.accessType !== CollectionAccessType.OPEN) continue;

        const recipientUserId = collection.authorId.value;
        if (recipientUserId === bundle.actorId) continue;

        await this.createNotificationUseCase.execute({
          type: NotificationType.USER_ADDED_TO_YOUR_COLLECTION,
          recipientUserId,
          actorUserId: bundle.actorId,
          cardId: bundle.cardId,
          collectionId: collectionIdStr,
        });
      }

      return ok(undefined);
    } catch (error) {
      console.error('Error in CollectionContributionBundleHandler:', error);
      return ok(undefined);
    }
  }
}
