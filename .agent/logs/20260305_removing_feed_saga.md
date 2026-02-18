# Removing SAGA Pattern from Feed Event Processing

**Date**: 2026-03-05
**Status**: Design Document
**Author**: System Design

## Executive Summary

This document outlines the plan to remove the `CardCollectionSaga` pattern from feed event processing. The saga adds unnecessary complexity for handling `CardAddedToLibrary` and `CardAddedToCollection` events. We will replace it with direct event handling using distributed locking at the service layer to prevent race conditions.

---

## 1. Current State

### Event Flow (With SAGA)

```
CardAddedToLibraryEvent → CardAddedToLibraryEventHandler
                                    ↓
                          CardCollectionSaga (3-second aggregation)
                                    ↓
                          AddActivityToFeedUseCase
                                    ↓
                               FeedService (2-minute deduplication)
                                    ↓
                          DrizzleFeedRepository

CardAddedToCollectionEvent → CardAddedToCollectionEventHandler
                                    ↓
                          CardCollectionSaga (3-second aggregation)
                                    ↓
                          AddActivityToFeedUseCase
                                    ↓
                               FeedService (2-minute deduplication)
                                    ↓
                          DrizzleFeedRepository
```

### What CardCollectionSaga Does

**File**: `src/modules/feeds/application/sagas/CardCollectionSaga.ts`

1. **Short-term event aggregation (3 seconds)**: Merges events that happen nearly simultaneously
2. **Distributed locking via Redis**: Prevents race conditions when multiple workers process events
   - Lock key pattern: `saga:feed:lock:{cardId}-{actorId}`
   - State key pattern: `saga:feed:pending:{cardId}-{actorId}`
   - Lock TTL: 3-8 seconds (aggregation window + 5 seconds)
   - Retry: 15 attempts with exponential backoff (100ms base, capped at 2s)
3. **Timestamp preservation**: Tracks earliest `addedAt` timestamp from all events
4. **Deferred execution**: Batches events before hitting the database

### What FeedService Does

**File**: `src/modules/feeds/domain/services/FeedService.ts`

1. **Medium-term deduplication (2 minutes)**: Checks for recent activities via `findRecentCardCollectedActivity`
2. **Collection merging**: Updates existing activities with new collection IDs
3. **Activity creation**: Creates new activities when no recent one exists

### Why It Was Built

The saga was designed to handle the case where:

- A user clicks "save" on a card
- System generates `CardAddedToLibraryEvent`
- System also generates `CardAddedToCollectionEvent` (if added to collections)
- Both events arrive nearly simultaneously at different workers
- Without coordination, this could create 2 separate activities instead of 1 merged activity

---

## 2. Why Remove It

### Reasons for Removal

1. **Unnecessary Complexity**: Two layers of deduplication (3-second saga + 2-minute service) is overkill
2. **Cognitive Overhead**: Understanding saga pattern adds mental load for future developers
3. **Inflexibility**: Eventually we want to handle events differently:
   - Following feed (only from followed users/collections)
   - Global feed (all activities)
   - Different aggregation rules per feed type
4. **Redundancy**: FeedService already handles the core use case via 2-minute window
5. **Maintenance Burden**: More code to maintain, debug, and test
6. **Over-Engineering**: The 3-second aggregation is a micro-optimization that adds macro-complexity

### What We're Keeping

- FeedService's 2-minute deduplication window (good enough)
- Time-based activity merging at insert level
- Clean separation between event handling and business logic

---

## 3. New Architecture

### Simplified Event Flow (Without SAGA)

```
CardAddedToLibraryEvent → CardAddedToLibraryEventHandler
                                    ↓
                          AddActivityToFeedUseCase
                                    ↓
                          FeedService (with locking + 2-minute deduplication)
                                    ↓
                          DrizzleFeedRepository

CardAddedToCollectionEvent → CardAddedToCollectionEventHandler
                                    ↓
                          AddActivityToFeedUseCase
                                    ↓
                          FeedService (with locking + 2-minute deduplication)
                                    ↓
                          DrizzleFeedRepository
```

### Key Changes

1. **Event handlers call use case directly** (no saga intermediary)
2. **Locking moves to FeedService layer** (during check-and-insert)
3. **Each event processed independently** (simpler to reason about)
4. **Future flexibility** for different feed types

---

## 4. Locking Strategy

### Why We Need Locking

Without locking, race conditions can occur:

```
Timeline without locking:
T0: Worker A receives CardAddedToLibraryEvent
T1: Worker B receives CardAddedToCollectionEvent (same card+actor)
T2: Worker A queries: findRecentCardCollectedActivity → finds nothing
T3: Worker B queries: findRecentCardCollectedActivity → finds nothing
T4: Worker A inserts new activity
T5: Worker B inserts new activity (DUPLICATE!)
```

With locking:

```
Timeline with locking:
T0: Worker A receives CardAddedToLibraryEvent
T1: Worker B receives CardAddedToCollectionEvent
T2: Worker A acquires lock for "card123-actor456"
T3: Worker B tries to acquire same lock → WAITS
T4: Worker A queries → finds nothing → inserts activity → releases lock
T5: Worker B acquires lock
T6: Worker B queries → finds Worker A's activity → merges collections → releases lock
```

### Implementation: Use Existing RedisLockService

**Files**:

- Interface: `src/shared/infrastructure/locking/ILockService.ts`
- Implementation: `src/shared/infrastructure/locking/RedisLockService.ts`

The codebase already has a production-ready distributed locking service using **Redlock** algorithm.

**Characteristics**:

- Uses `redlock` npm package (industry standard)
- 3 retry attempts with exponential backoff (200ms base + 200ms jitter)
- Configurable lock TTL
- Handles container shutdown gracefully (SIGTERM)

### Lock Configuration

```typescript
// Lock key pattern
const lockKey = `feed:activity:${actorId}:${cardId}`;

// Lock TTL: 10 seconds (generous for database operation)
const lockTTL = 10000; // milliseconds

// Lock during FeedService.addCardCollectedActivity()
await lockService.withLock(lockKey, lockTTL, async () => {
  // Check for recent activity
  // Insert or update activity
});
```

### Handling Lock Failures

If lock acquisition fails after retries:

- Log warning (for monitoring)
- Proceed with operation anyway (accept small risk of duplicate)
- Rationale: Better to process event than drop it

**Why this is acceptable**:

- Lock failures are rare with Redlock
- 2-minute deduplication window catches most duplicates anyway
- Better to have occasional duplicate than lose user actions

---

## 5. Implementation Steps

### Step 1: Modify Event Handlers

**Files to Modify**:

- `src/modules/feeds/application/eventHandlers/CardAddedToLibraryEventHandler.ts`
- `src/modules/feeds/application/eventHandlers/CardAddedToCollectionEventHandler.ts`

**Changes**:

```typescript
// BEFORE (with saga)
export class CardAddedToLibraryEventHandler
  implements IEventHandler<CardAddedToLibraryEvent>
{
  constructor(private cardCollectionSaga: CardCollectionSaga) {}

  async handle(event: CardAddedToLibraryEvent): Promise<Result<void>> {
    return this.cardCollectionSaga.handleCardEvent(event);
  }
}

// AFTER (direct to use case)
export class CardAddedToLibraryEventHandler
  implements IEventHandler<CardAddedToLibraryEvent>
{
  constructor(private addActivityToFeedUseCase: AddActivityToFeedUseCase) {}

  async handle(event: CardAddedToLibraryEvent): Promise<Result<void>> {
    const result = await this.addActivityToFeedUseCase.execute({
      type: ActivityTypeEnum.CARD_COLLECTED,
      actorId: event.curatorId.value,
      cardId: event.cardId.getStringValue(),
      collectionIds: undefined, // Library event has no collections
      createdAt: event.addedAt,
    });

    if (result.isErr()) {
      console.error('Failed to add library activity to feed:', result.error);
      return err(result.error);
    }

    return ok(undefined);
  }
}
```

### Step 2: Add Locking to FeedService

**File to Modify**: `src/modules/feeds/domain/services/FeedService.ts`

**Changes**:

```typescript
export class FeedService implements DomainService {
  constructor(
    private feedRepository: IFeedRepository,
    private lockService: ILockService, // ADD THIS
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
      // Acquire distributed lock
      return await this.lockService.withLock(lockKey, lockTTL, async () => {
        // Existing logic: check for recent activity, insert or update
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
      });
    } catch (error) {
      // Lock acquisition failed after retries
      console.warn(
        `Failed to acquire lock for ${lockKey}, proceeding without lock`,
        error,
      );

      // Proceed with operation anyway (fallback behavior)
      // ... (duplicate the lock body here, or extract to a method)
    }
  }
}
```

### Step 3: Update FeedWorkerProcess

**File to Modify**: `src/shared/infrastructure/processes/FeedWorkerProcess.ts`

**Changes**:

```typescript
// BEFORE
protected async registerHandlers(
  subscriber: IEventSubscriber,
  services: WorkerServices,
  repositories: Repositories,
): Promise<void> {
  const useCases = UseCaseFactory.createForWorker(repositories, services);

  // Create saga with proper use case dependency and state store from services
  const cardCollectionSaga = new CardCollectionSaga(
    useCases.addActivityToFeedUseCase,
    services.sagaStateStore,
  );

  const cardAddedToLibraryHandler = new CardAddedToLibraryEventHandler(
    cardCollectionSaga,
  );
  const cardAddedToCollectionHandler = new CardAddedToCollectionEventHandler(
    cardCollectionSaga,
  );

  await subscriber.subscribe(
    EventNames.CARD_ADDED_TO_LIBRARY,
    cardAddedToLibraryHandler,
  );

  await subscriber.subscribe(
    EventNames.CARD_ADDED_TO_COLLECTION,
    cardAddedToCollectionHandler,
  );
}

// AFTER
protected async registerHandlers(
  subscriber: IEventSubscriber,
  services: WorkerServices,
  repositories: Repositories,
): Promise<void> {
  const useCases = UseCaseFactory.createForWorker(repositories, services);

  const cardAddedToLibraryHandler = new CardAddedToLibraryEventHandler(
    useCases.addActivityToFeedUseCase,
  );
  const cardAddedToCollectionHandler = new CardAddedToCollectionEventHandler(
    useCases.addActivityToFeedUseCase,
  );

  await subscriber.subscribe(
    EventNames.CARD_ADDED_TO_LIBRARY,
    cardAddedToLibraryHandler,
  );

  await subscriber.subscribe(
    EventNames.CARD_ADDED_TO_COLLECTION,
    cardAddedToCollectionHandler,
  );
}
```

### Step 4: Update ServiceFactory

**File to Modify**: `src/shared/infrastructure/http/factories/ServiceFactory.ts`

**Changes**:

- Inject `lockService` into `FeedService` constructor
- Lock service already created in `createForWorker()`

```typescript
// In createForWorker() method
const feedService = new FeedService(
  feedRepository,
  services.lockService, // ADD THIS
);
```

### Step 5: Remove Saga Files

**Files to Remove**:

- `src/modules/feeds/application/sagas/CardCollectionSaga.ts`

**Files to Keep** (still used by CardNotificationSaga):

- `src/modules/feeds/application/sagas/ISagaStateStore.ts`
- `src/modules/feeds/infrastructure/RedisSagaStateStore.ts`
- `src/modules/feeds/infrastructure/InMemorySagaStateStore.ts`

### Step 6: Update Tests

**Files to Update**:

- Event handler tests
- FeedService tests (add lock service mock)
- Integration tests for feed worker

---

## 6. Files Summary

### Files to Modify

| File                                   | Changes                                                |
| -------------------------------------- | ------------------------------------------------------ |
| `CardAddedToLibraryEventHandler.ts`    | Inject `AddActivityToFeedUseCase`, call directly       |
| `CardAddedToCollectionEventHandler.ts` | Inject `AddActivityToFeedUseCase`, call directly       |
| `FeedService.ts`                       | Add `ILockService` dependency, wrap operations in lock |
| `FeedWorkerProcess.ts`                 | Remove saga instantiation, pass use case to handlers   |
| `ServiceFactory.ts`                    | Inject lock service into FeedService                   |

### Files to Remove

| File                    | Reason           |
| ----------------------- | ---------------- |
| `CardCollectionSaga.ts` | No longer needed |

### Files to Keep (Used by Other Features)

| File                        | Reason                       |
| --------------------------- | ---------------------------- |
| `ISagaStateStore.ts`        | Used by CardNotificationSaga |
| `RedisSagaStateStore.ts`    | Used by CardNotificationSaga |
| `InMemorySagaStateStore.ts` | Used by CardNotificationSaga |

---

## 11. Conclusion

Removing `CardCollectionSaga` simplifies the architecture while maintaining correctness and performance. The existing FeedService deduplication logic, combined with distributed locking, provides sufficient protection against race conditions. This change enables future flexibility for implementing different feed types without the constraints of the saga pattern.

**Key Takeaway**: Keep it simple. The 2-minute deduplication window + distributed locking is good enough. The 3-second saga aggregation was premature optimization.

---

## Appendix: Code References

### Current Implementation

- **CardCollectionSaga**: `src/modules/feeds/application/sagas/CardCollectionSaga.ts:21-236`
- **FeedService deduplication**: `src/modules/feeds/domain/services/FeedService.ts:29-66`
- **DrizzleFeedRepository.findRecentCardCollectedActivity**: `src/modules/feeds/infrastructure/repositories/DrizzleFeedRepository.ts:362-408`

### Locking Infrastructure

- **ILockService**: `src/shared/infrastructure/locking/ILockService.ts`
- **RedisLockService**: `src/shared/infrastructure/locking/RedisLockService.ts`
- **Redlock configuration**: Uses `redlock` npm package with 3 retries, 200ms delays

### Worker Configuration

- **FeedWorkerProcess**: `src/shared/infrastructure/processes/FeedWorkerProcess.ts:18-66`
- **ServiceFactory**: `src/shared/infrastructure/http/factories/ServiceFactory.ts`
