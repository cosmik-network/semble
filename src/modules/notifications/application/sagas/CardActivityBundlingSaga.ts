import { Result, ok, err } from '../../../../shared/core/Result';
import { CardAddedToLibraryEvent } from '../../../cards/domain/events/CardAddedToLibraryEvent';
import { CardAddedToCollectionEvent } from '../../../cards/domain/events/CardAddedToCollectionEvent';
import { ISagaStateStore } from '../../../feeds/application/sagas/ISagaStateStore';
import {
  CardActivityBundle,
  ICardActivityBundleHandler,
} from '../bundleHandlers/ICardActivityBundleHandler';

interface PendingCardActivity {
  cardId: string;
  actorId: string;
  collectionIds: string[];
  timestamp: Date;
  hasLibraryEvent: boolean;
  hasCollectionEvents: boolean;
}

/**
 * Buffers CardAddedToLibrary + CardAddedToCollection events keyed on
 * (cardId, actorId). After AGGREGATION_WINDOW_MS, emits one CardActivityBundle
 * to each registered handler. Handlers decide what notifications to write.
 *
 * Does not know about recipients, notification types, or subscription state.
 */
export class CardActivityBundlingSaga {
  private readonly AGGREGATION_WINDOW_MS = 3000;
  private readonly REDIS_KEY_PREFIX = 'saga:card-activity-bundle';

  constructor(
    private stateStore: ISagaStateStore,
    private bundleHandlers: ICardActivityBundleHandler[],
  ) {}

  async handleCardEvent(
    event: CardAddedToLibraryEvent | CardAddedToCollectionEvent,
  ): Promise<Result<void>> {
    try {
      const cardId = event.cardId.getStringValue();
      const actorId = this.getActorId(event);
      const aggregationKey = `${cardId}-${actorId}`;

      const maxRetries = 15;
      const baseDelay = 100;
      const maxDelay = 2000;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const lockAcquired = await this.acquireLock(aggregationKey);

        if (lockAcquired) {
          try {
            const existing = await this.getPendingActivity(aggregationKey);

            if (existing && this.isWithinWindow(existing)) {
              this.mergeEvent(existing, event);
              await this.setPendingActivity(aggregationKey, existing);
            } else {
              const fresh = this.createPendingActivity(cardId, actorId);
              this.mergeEvent(fresh, event);
              await this.setPendingActivity(aggregationKey, fresh);
              this.scheduleFlush(aggregationKey);
            }

            return ok(undefined);
          } finally {
            await this.releaseLock(aggregationKey);
          }
        }

        if (attempt < maxRetries - 1) {
          const exponentialDelay = baseDelay * Math.pow(1.5, attempt);
          const jitter = Math.random() * 50;
          const delay = Math.min(exponentialDelay + jitter, maxDelay);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      console.warn(
        `CardActivityBundlingSaga: failed to acquire lock after ${maxRetries} attempts for ${aggregationKey}`,
      );
      return ok(undefined);
    } catch (error) {
      console.error(
        'Error in CardActivityBundlingSaga.handleCardEvent:',
        error,
      );
      return err(error as Error);
    }
  }

  /**
   * Drop a pending bucket (called by removal handlers when a card is removed
   * mid-window — no notifications were written yet so we just discard).
   */
  async cancelPending(cardId: string, actorId: string): Promise<void> {
    const aggregationKey = `${cardId}-${actorId}`;
    await this.deletePendingActivity(aggregationKey);
  }

  private getActorId(
    event: CardAddedToLibraryEvent | CardAddedToCollectionEvent,
  ): string {
    if ('curatorId' in event) {
      return event.curatorId.value;
    }
    return event.addedBy.value;
  }

  private createPendingActivity(
    cardId: string,
    actorId: string,
  ): PendingCardActivity {
    return {
      cardId,
      actorId,
      collectionIds: [],
      timestamp: new Date(),
      hasLibraryEvent: false,
      hasCollectionEvents: false,
    };
  }

  private mergeEvent(
    pending: PendingCardActivity,
    event: CardAddedToLibraryEvent | CardAddedToCollectionEvent,
  ): void {
    if (event instanceof CardAddedToLibraryEvent) {
      pending.hasLibraryEvent = true;
    } else if (event instanceof CardAddedToCollectionEvent) {
      pending.hasCollectionEvents = true;
      const collectionId = event.collectionId.getStringValue();
      if (!pending.collectionIds.includes(collectionId)) {
        pending.collectionIds.push(collectionId);
      }
    }
  }

  private isWithinWindow(pending: PendingCardActivity): boolean {
    const now = new Date();
    const timeDiff = now.getTime() - pending.timestamp.getTime();
    return timeDiff <= this.AGGREGATION_WINDOW_MS;
  }

  private getPendingKey(aggregationKey: string): string {
    return `${this.REDIS_KEY_PREFIX}:pending:${aggregationKey}`;
  }

  private getLockKey(aggregationKey: string): string {
    return `${this.REDIS_KEY_PREFIX}:lock:${aggregationKey}`;
  }

  private async getPendingActivity(
    aggregationKey: string,
  ): Promise<PendingCardActivity | null> {
    const data = await this.stateStore.get(this.getPendingKey(aggregationKey));
    if (!data) return null;
    const parsed = JSON.parse(data);
    parsed.timestamp = new Date(parsed.timestamp);
    return parsed;
  }

  private async setPendingActivity(
    aggregationKey: string,
    pending: PendingCardActivity,
  ): Promise<void> {
    const key = this.getPendingKey(aggregationKey);
    const ttlSeconds = Math.ceil(this.AGGREGATION_WINDOW_MS / 1000) + 5;
    await this.stateStore.setex(key, ttlSeconds, JSON.stringify(pending));
  }

  private async deletePendingActivity(aggregationKey: string): Promise<void> {
    await this.stateStore.del(this.getPendingKey(aggregationKey));
  }

  private async acquireLock(aggregationKey: string): Promise<boolean> {
    const lockKey = this.getLockKey(aggregationKey);
    const lockTtl = Math.ceil(this.AGGREGATION_WINDOW_MS / 1000) + 5;
    const result = await this.stateStore.set(lockKey, '1', 'EX', lockTtl, 'NX');
    return result === 'OK';
  }

  private async releaseLock(aggregationKey: string): Promise<void> {
    await this.stateStore.del(this.getLockKey(aggregationKey));
  }

  private scheduleFlush(aggregationKey: string): void {
    setTimeout(async () => {
      await this.flushBundle(aggregationKey);
    }, this.AGGREGATION_WINDOW_MS);
  }

  private async flushBundle(aggregationKey: string): Promise<void> {
    const lockAcquired = await this.acquireLock(aggregationKey);
    if (!lockAcquired) return;

    let pending: PendingCardActivity | null = null;
    try {
      pending = await this.getPendingActivity(aggregationKey);
      if (!pending) return;

      const bundle: CardActivityBundle = {
        cardId: pending.cardId,
        actorId: pending.actorId,
        collectionIds: pending.collectionIds,
        hasLibraryEvent: pending.hasLibraryEvent,
        hasCollectionEvents: pending.hasCollectionEvents,
        bundledAt: new Date(),
      };

      // Run all bundle handlers concurrently. One handler's failure must not
      // prevent the others from running.
      const results = await Promise.allSettled(
        this.bundleHandlers.map((h) => h.handle(bundle)),
      );

      for (const r of results) {
        if (r.status === 'rejected') {
          console.error('Bundle handler threw:', r.reason);
        } else if (r.value.isErr()) {
          console.error('Bundle handler returned err:', r.value.error);
        }
      }
    } finally {
      if (pending) {
        await this.deletePendingActivity(aggregationKey);
      }
      await this.releaseLock(aggregationKey);
    }
  }
}
