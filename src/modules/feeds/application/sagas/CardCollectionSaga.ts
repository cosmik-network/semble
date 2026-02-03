import { Result, ok, err } from '../../../../shared/core/Result';
import { CardAddedToLibraryEvent } from '../../../cards/domain/events/CardAddedToLibraryEvent';
import { CardAddedToCollectionEvent } from '../../../cards/domain/events/CardAddedToCollectionEvent';
import {
  AddActivityToFeedUseCase,
  AddCardCollectedActivityDTO,
} from '../useCases/commands/AddActivityToFeedUseCase';
import { ActivityTypeEnum } from '../../domain/value-objects/ActivityType';
import { ISagaStateStore } from './ISagaStateStore';

interface PendingCardActivity {
  cardId: string;
  actorId: string;
  collectionIds: string[];
  timestamp: Date; // Timestamp for the aggregation window
  eventTimestamps: Date[]; // Track all addedAt timestamps from events
  hasLibraryEvent: boolean;
  hasCollectionEvents: boolean;
}

export class CardCollectionSaga {
  private readonly AGGREGATION_WINDOW_MS = 3000;
  private readonly REDIS_KEY_PREFIX = 'saga:feed';

  constructor(
    private addActivityToFeedUseCase: AddActivityToFeedUseCase,
    private stateStore: ISagaStateStore,
  ) {}

  async handleCardEvent(
    event: CardAddedToLibraryEvent | CardAddedToCollectionEvent,
  ): Promise<Result<void>> {
    const aggregationKey = this.createKey(event);

    // Retry lock acquisition with longer delays and more attempts for high concurrency
    const maxRetries = 15; // Increased from 5
    const baseDelay = 100; // Increased from 50ms
    const maxDelay = 2000; // Cap the maximum delay

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const lockAcquired = await this.acquireLock(aggregationKey);

      if (lockAcquired) {
        try {
          const existing = await this.getPendingActivity(aggregationKey);

          if (existing && this.isWithinWindow(existing)) {
            this.mergeActivity(existing, event);
            await this.setPendingActivity(aggregationKey, existing);
          } else {
            const newActivity = this.createNewPendingActivity(event);
            await this.setPendingActivity(aggregationKey, newActivity);
            await this.scheduleFlush(aggregationKey);
          }

          return ok(undefined);
        } finally {
          await this.releaseLock(aggregationKey);
        }
      }

      // Lock not acquired, wait and retry
      if (attempt < maxRetries - 1) {
        // Use exponential backoff with jitter and cap at maxDelay
        const exponentialDelay = baseDelay * Math.pow(1.5, attempt);
        const jitter = Math.random() * 50; // Add randomness to prevent thundering herd
        const delay = Math.min(exponentialDelay + jitter, maxDelay);

        console.log(
          `Lock acquisition failed for ${aggregationKey}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // All retries failed - this shouldn't happen often
    console.warn(
      `Failed to acquire lock after ${maxRetries} attempts for ${aggregationKey}`,
    );
    return ok(undefined);
  }

  // Key helpers
  private getPendingKey(aggregationKey: string): string {
    return `${this.REDIS_KEY_PREFIX}:pending:${aggregationKey}`;
  }

  private getLockKey(aggregationKey: string): string {
    return `${this.REDIS_KEY_PREFIX}:lock:${aggregationKey}`;
  }

  // State management
  private async getPendingActivity(
    aggregationKey: string,
  ): Promise<PendingCardActivity | null> {
    const data = await this.stateStore.get(this.getPendingKey(aggregationKey));
    if (!data) return null;

    const parsed = JSON.parse(data);
    // Convert timestamp strings back to Date objects
    parsed.timestamp = new Date(parsed.timestamp);
    parsed.eventTimestamps = parsed.eventTimestamps.map(
      (ts: string) => new Date(ts),
    );
    return parsed;
  }

  private async setPendingActivity(
    aggregationKey: string,
    activity: PendingCardActivity,
  ): Promise<void> {
    const key = this.getPendingKey(aggregationKey);
    const ttlSeconds = Math.ceil(this.AGGREGATION_WINDOW_MS / 1000) + 5;
    await this.stateStore.setex(key, ttlSeconds, JSON.stringify(activity));
  }

  private async deletePendingActivity(aggregationKey: string): Promise<void> {
    await this.stateStore.del(this.getPendingKey(aggregationKey));
  }

  // Distributed locking
  private async acquireLock(aggregationKey: string): Promise<boolean> {
    const lockKey = this.getLockKey(aggregationKey);
    // Reduced lock TTL to allow faster recovery in high concurrency scenarios
    const lockTtl = Math.ceil(this.AGGREGATION_WINDOW_MS / 1000) + 5; // Reduced from +10 to +5
    const result = await this.stateStore.set(lockKey, '1', 'EX', lockTtl, 'NX');
    return result === 'OK';
  }

  private async releaseLock(aggregationKey: string): Promise<void> {
    await this.stateStore.del(this.getLockKey(aggregationKey));
  }

  private createKey(
    event: CardAddedToLibraryEvent | CardAddedToCollectionEvent,
  ): string {
    const cardId = event.cardId.getStringValue();
    const actorId = this.getActorId(event);
    return `${cardId}-${actorId}`;
  }

  private getActorId(
    event: CardAddedToLibraryEvent | CardAddedToCollectionEvent,
  ): string {
    if ('curatorId' in event) {
      return event.curatorId.value; // CardAddedToLibraryEvent
    } else {
      return event.addedBy.value; // CardAddedToCollectionEvent
    }
  }

  private isWithinWindow(pending: PendingCardActivity): boolean {
    const now = new Date();
    const timeDiff = now.getTime() - pending.timestamp.getTime();
    return timeDiff <= this.AGGREGATION_WINDOW_MS;
  }

  private createNewPendingActivity(
    event: CardAddedToLibraryEvent | CardAddedToCollectionEvent,
  ): PendingCardActivity {
    const cardId = event.cardId.getStringValue();
    const actorId = this.getActorId(event);

    const pending: PendingCardActivity = {
      cardId,
      actorId,
      collectionIds: [],
      timestamp: new Date(),
      eventTimestamps: [],
      hasLibraryEvent: false,
      hasCollectionEvents: false,
    };

    this.mergeActivity(pending, event);
    return pending;
  }

  private mergeActivity(
    existing: PendingCardActivity,
    event: CardAddedToLibraryEvent | CardAddedToCollectionEvent,
  ): void {
    // Track the addedAt timestamp from the event
    existing.eventTimestamps.push(event.addedAt);

    if ('curatorId' in event) {
      // CardAddedToLibraryEvent
      existing.hasLibraryEvent = true;
    } else {
      // CardAddedToCollectionEvent
      existing.hasCollectionEvents = true;
      const collectionId = event.collectionId.getStringValue();
      if (!existing.collectionIds.includes(collectionId)) {
        existing.collectionIds.push(collectionId);
      }
    }
  }

  private async scheduleFlush(aggregationKey: string): Promise<void> {
    setTimeout(async () => {
      await this.flushActivity(aggregationKey);
    }, this.AGGREGATION_WINDOW_MS);
  }

  private async flushActivity(aggregationKey: string): Promise<void> {
    const lockAcquired = await this.acquireLock(aggregationKey);
    if (!lockAcquired) return;

    try {
      const pending = await this.getPendingActivity(aggregationKey);
      if (!pending) return;

      // Calculate the earliest timestamp from all events
      // If no timestamps (shouldn't happen), use current time as fallback
      const earliestTimestamp =
        pending.eventTimestamps.length > 0
          ? pending.eventTimestamps.reduce((earliest, current) =>
              current < earliest ? current : earliest,
            )
          : undefined;

      const request: AddCardCollectedActivityDTO = {
        type: ActivityTypeEnum.CARD_COLLECTED,
        actorId: pending.actorId,
        cardId: pending.cardId,
        collectionIds:
          pending.collectionIds.length > 0 ? pending.collectionIds : undefined,
        createdAt: earliestTimestamp,
      };

      await this.addActivityToFeedUseCase.execute(request);
    } finally {
      await this.deletePendingActivity(aggregationKey);
      await this.releaseLock(aggregationKey);
    }
  }
}
