import { Result, ok, err } from '../../../../shared/core/Result';
import { DomainService } from '../../../../shared/domain/DomainService';
import { FeedActivity } from '../FeedActivity';
import { IFeedRepository } from '../IFeedRepository';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';
import { UrlType } from '../../../cards/domain/value-objects/UrlType';

export class FeedServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedServiceError';
  }
}

export class FeedService implements DomainService {
  constructor(private feedRepository: IFeedRepository) {}

  async addCardCollectedActivity(
    actorId: CuratorId,
    cardId: CardId,
    collectionIds?: CollectionId[],
    urlType?: UrlType,
  ): Promise<Result<FeedActivity, FeedServiceError>> {
    try {
      const activityResult = FeedActivity.createCardCollected(
        actorId,
        cardId,
        collectionIds,
        urlType,
      );

      if (activityResult.isErr()) {
        return err(new FeedServiceError(activityResult.error.message));
      }

      const activity = activityResult.value;
      const saveResult = await this.feedRepository.addActivity(activity);

      if (saveResult.isErr()) {
        return err(
          new FeedServiceError(
            `Failed to save activity: ${saveResult.error.message}`,
          ),
        );
      }

      return ok(activity);
    } catch (error) {
      return err(
        new FeedServiceError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
