import { Result, ok, err } from '../../../../shared/core/Result';
import { DomainService } from '../../../../shared/domain/DomainService';
import { FeedActivity } from '../FeedActivity';
import { IFeedRepository } from '../IFeedRepository';
import { CuratorId } from '../../../cards/domain/value-objects/CuratorId';
import { CardId } from '../../../cards/domain/value-objects/CardId';
import { CollectionId } from '../../../cards/domain/value-objects/CollectionId';
import { UrlType } from '../../../cards/domain/value-objects/UrlType';
import { IDistributedLockService } from '../../../../shared/infrastructure/locking/IDistributedLockService';

export class FeedServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedServiceError';
  }
}

export class FeedService implements DomainService {
  constructor(
    private feedRepository: IFeedRepository,
    private distributedLockService: IDistributedLockService,
  ) {}

  async addCardCollectedActivity(
    actorId: CuratorId,
    cardId: CardId,
    collectionIds?: CollectionId[],
    urlType?: UrlType,
    source?: string,
    createdAt?: Date,
  ): Promise<Result<FeedActivity, FeedServiceError>> {
    const lockKey = `feed:activity:${actorId.value}:${cardId.getStringValue()}`;
    const lockTTL = 10000; // 10 seconds

    try {
      // Acquire distributed lock to prevent race conditions when multiple workers
      // process events for the same card+actor combination
      return await this.distributedLockService.withLock(
        lockKey,
        lockTTL,
        async () => {
          // Check for recent duplicate activity (within 2 minutes)
          const recentActivityResult =
            await this.feedRepository.findRecentCardCollectedActivity(
              actorId,
              cardId,
              2, // 2 minutes
            );

          if (recentActivityResult.isErr()) {
            return err(
              new FeedServiceError(
                `Failed to check for recent activity: ${recentActivityResult.error.message}`,
              ),
            );
          }

          const recentActivity = recentActivityResult.value;

          if (recentActivity && collectionIds && collectionIds.length > 0) {
            // Update existing activity by merging collections
            recentActivity.mergeCollections(collectionIds);

            const updateResult =
              await this.feedRepository.updateActivity(recentActivity);

            if (updateResult.isErr()) {
              return err(
                new FeedServiceError(
                  `Failed to update activity: ${updateResult.error.message}`,
                ),
              );
            }

            return ok(recentActivity);
          } else if (recentActivity) {
            // Recent activity exists but no new collections to add, return existing
            return ok(recentActivity);
          }

          // No recent activity found, create new one
          const activityResult = FeedActivity.createCardCollected(
            actorId,
            cardId,
            collectionIds,
            urlType,
            source,
            createdAt,
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
        },
      );
    } catch (error) {
      return err(
        new FeedServiceError(
          `Failed to acquire lock or process activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
    }
  }
}
