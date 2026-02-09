# Following Feed: Application Layer Implementation Guide

## Architectural Decision: Single Use Case with Fan-out

### Decision

**Fan-out logic will be coordinated inside `AddActivityToFeedUseCase`**, not in a separate use case.

## Application Layer Architecture

### Overview

```
Event: CARD_ADDED_TO_LIBRARY / CARD_ADDED_TO_COLLECTION
  ↓
Event Handler (unchanged interface)
  ↓
AddActivityToFeedUseCase.execute()
  ├─ 1. Validate input (existing)
  ├─ 2. Fetch card metadata (existing)
  ├─ 3. Create activity via FeedService
  │    └─ [Distributed lock + dedup check + insert/update]
  ├─ 4. Get followers of actor (user) ← NEW
  ├─ 5. Get followers of collections (if any) ← NEW
  ├─ 6. Combine & deduplicate follower IDs ← NEW
  └─ 7. Fan-out to followers ← NEW
       └─ [Idempotent bulk insert via ON CONFLICT DO NOTHING]
```

### Responsibilities

**Use Case (`AddActivityToFeedUseCase`):**

- Orchestrates the complete flow: validation → activity creation → fan-out
- Coordinates calls to multiple repositories
- Implements business logic
- Handles errors with appropriate strategies

---

## Repository Interfaces

### New Repository: `IFollowsRepository`

**Purpose:** Query following relationships to determine fan-out targets.

**Note:** This repository is **read-only** for the purpose of feed fan-out. Follow/unfollow operations (write) are out of scope for this implementation.

```typescript
export interface Follow {
  followerId: string; // DID of user who is following
  targetId: string; // User DID or Collection UUID being followed
  targetType: 'USER' | 'COLLECTION';
}

export interface IFollowsRepository {
  /**
   * Get all followers of a specific user.
   *
   * @param targetId - User DID being followed
   * @param targetType - Must be 'USER' for this method
   * @returns Array of Follow records (can be empty if no followers)
   *
   * Example:
   *   getFollowers('did:plc:alice123', 'USER')
   *   → [{ followerId: 'did:plc:bob456', targetId: 'did:plc:alice123', targetType: 'USER' }]
   */
  getFollowers(targetId: string, targetType: 'USER'): Promise<Result<Follow[]>>;

  /**
   * Get all followers of multiple collections (combined, deduplicated).
   *
   * @param collectionIds - Array of collection UUIDs
   * @returns Array of Follow records (can be empty)
   *
   * Example:
   *   getFollowersOfCollections(['uuid-1', 'uuid-2'])
   *   → [
   *       { followerId: 'did:plc:bob456', targetId: 'uuid-1', targetType: 'COLLECTION' },
   *       { followerId: 'did:plc:carol789', targetId: 'uuid-2', targetType: 'COLLECTION' }
   *     ]
   *
   * Notes:
   * - Returns empty array if collectionIds is empty
   * - Results may include duplicates if a user follows multiple input collections
   *   (deduplication happens at use case level)
   */
  getFollowersOfCollections(collectionIds: string[]): Promise<Result<Follow[]>>;
}
```

### Updated Repository: `IFeedRepository`

**Add these methods to the existing interface:**

```typescript
export interface IFeedRepository {
  // ... existing methods (addActivity, updateActivity, etc.) ...

  /**
   * Fan-out an activity to multiple followers' following feeds.
   *
   * @param activityId - Activity to distribute
   * @param followerIds - User DIDs to receive this activity (deduplicated by caller)
   * @param createdAt - Activity timestamp (denormalized for sorting)
   * @returns Success or error
   *
   * Idempotency guarantee:
   * - Uses ON CONFLICT DO NOTHING on primary key (user_id, activity_id)
   * - Safe to call multiple times with same inputs
   * - Retries are silent (no error on duplicate)
   *
   * Performance:
   * - Bulk insert operation (single query)
   * - Returns immediately if followerIds is empty (no-op)
   *
   * Example:
   *   fanOutActivityToFollowers(
   *     activityId,
   *     ['did:plc:bob456', 'did:plc:carol789'],
   *     new Date('2026-03-05T10:00:00Z')
   *   )
   *   → Inserts 2 rows into following_feed_items
   */
  fanOutActivityToFollowers(
    activityId: ActivityId,
    followerIds: string[],
    createdAt: Date,
  ): Promise<Result<void>>;

  /**
   * Get a user's following feed (paginated).
   *
   * @param userId - User DID whose feed to fetch
   * @param options - Pagination, filters (urlType, source, beforeActivityId)
   * @returns Paginated feed activities
   *
   * Query pattern:
   * - Filters by user_id on following_feed_items
   * - JOINs to feed_activities for full activity data
   * - Supports same filters as global feed (urlType, source)
   * - Cursor-based pagination via beforeActivityId
   *
   * Example:
   *   getFollowingFeed('did:plc:bob456', { page: 1, limit: 20, urlType: 'article' })
   *   → Returns up to 20 activities from Bob's following feed
   */
  getFollowingFeed(
    userId: string,
    options: FeedQueryOptions,
  ): Promise<Result<PaginatedFeedResult>>;
}
```

**Interface Contract:**

- `fanOutActivityToFollowers`:
  - **Idempotent** - Safe to retry with same inputs
  - **Bulk operation** - Single query for all follower IDs
  - **No-op if empty** - Returns `ok(undefined)` immediately if `followerIds.length === 0`
  - **Denormalized timestamp** - Stores `createdAt` for efficient sorting (no JOIN needed)

- `getFollowingFeed`:
  - **Same query options as global feed** - Reuses `FeedQueryOptions` type
  - **Same result format** - Returns `PaginatedFeedResult` (consistent with other feed queries)
  - **Efficient JOIN** - Single query with proper index usage

---

## Use Case Orchestration

### Updated `AddActivityToFeedUseCase`

#### Constructor Dependencies

```typescript
export class AddActivityToFeedUseCase implements UseCase<...> {
  constructor(
    private feedService: FeedService,              // Existing
    private cardRepository: ICardRepository,       // Existing
    private followsRepository: IFollowsRepository, // NEW - for fetching followers
    private feedRepository: IFeedRepository,       // NEW - for fan-out operation
  ) {}
}
```

#### Execution Flow

```typescript
async execute(request: AddActivityToFeedDTO): Promise<Result<...>> {
  try {
    // ========================================
    // PHASE 1: VALIDATION (Existing)
    // ========================================

    // Validate actorId, cardId, collectionIds
    // (existing code, unchanged)

    // ========================================
    // PHASE 2: FETCH CARD METADATA (Existing)
    // ========================================

    // Fetch card to get urlType and source
    // (existing code, unchanged)

    // ========================================
    // PHASE 3: CREATE ACTIVITY (Existing)
    // ========================================

    // Call FeedService with distributed locking
    const activityResult = await this.feedService.addCardCollectedActivity(
      actorId,
      cardId,
      collectionIds,
      urlType,
      source,
      createdAt,
    );

    if (activityResult.isErr()) {
      return err(new ValidationError(activityResult.error.message));
    }

    const activity = activityResult.value;

    // ========================================
    // PHASE 4: GET FOLLOWERS (NEW)
    // ========================================

    // 4a. Get followers of the actor (user who created activity)
    const userFollowersResult = await this.followsRepository.getFollowers(
      actorId.value,
      'USER'
    );

    const userFollowers = userFollowersResult.isOk()
      ? userFollowersResult.value.map(f => f.followerId)
      : [];

    // 4b. Get followers of collections (if any)
    let collectionFollowers: string[] = [];
    if (collectionIds && collectionIds.length > 0) {
      const collectionIdStrings = collectionIds.map(id => id.getStringValue());
      const collectionFollowersResult =
        await this.followsRepository.getFollowersOfCollections(collectionIdStrings);

      collectionFollowers = collectionFollowersResult.isOk()
        ? collectionFollowersResult.value.map(f => f.followerId)
        : [];
    }

    // 4c. Combine and deduplicate follower IDs
    const allFollowerIds = new Set([...userFollowers, ...collectionFollowers]);

    // ========================================
    // PHASE 5: FAN-OUT (NEW)
    // ========================================

    if (allFollowerIds.size > 0) {
      const fanOutResult = await this.feedRepository.fanOutActivityToFollowers(
        activity.activityId,
        Array.from(allFollowerIds),
        activity.createdAt,
      );

      // Error handling: Log but don't fail the use case
      // Activity already exists in global feed
      // Event retries will eventually distribute it
      if (fanOutResult.isErr()) {
        console.error('Fan-out failed (will retry on event retry):', fanOutResult.error);
        // Note: We do NOT return err here - see Error Handling section
      }
    }

    // ========================================
    // RETURN SUCCESS
    // ========================================

    return ok({
      activityId: activity.activityId.getStringValue(),
    });

  } catch (error) {
    return err(AppError.UnexpectedError.create(error));
  }
}
```

### Orchestration Principles

1. **Sequential execution** - Each phase depends on previous phase results
2. **Graceful degradation** - Follower lookup errors don't fail the use case (returns empty array)
3. **Deduplication at use case level** - Combine user + collection followers using `Set`
4. **Skip empty fan-out** - Don't call repository if no followers
5. **Business logic lives here** - Future conditional fan-out rules (e.g., "don't fan-out Margin library activities") implemented in this orchestration layer

---

## Integration with Event Handlers

### No Changes Required

Event handlers remain unchanged:

```typescript
export class CardAddedToLibraryEventHandler
  implements IEventHandler<CardAddedToLibraryEvent>
{
  constructor(private addActivityToFeedUseCase: AddActivityToFeedUseCase) {}

  async handle(event: CardAddedToLibraryEvent): Promise<Result<void>> {
    const result = await this.addActivityToFeedUseCase.execute({
      type: ActivityTypeEnum.CARD_COLLECTED,
      actorId: event.curatorId.value,
      cardId: event.cardId.getStringValue(),
      collectionIds: undefined,
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

## Dependency Injection Updates

### Factory Changes Required

Update the factory/composition root to inject new dependencies:

```typescript
// UseCaseFactory or similar
export class UseCaseFactory {
  createAddActivityToFeedUseCase(): AddActivityToFeedUseCase {
    return new AddActivityToFeedUseCase(
      this.feedService, // Existing
      this.cardRepository, // Existing
      this.repositoryFactory.followsRepository, // NEW
      this.repositoryFactory.feedRepository, // NEW (already exists, just inject)
    );
  }
}
```

```typescript
// RepositoryFactory
export class RepositoryFactory {
  // Existing
  get feedRepository(): IFeedRepository { ... }
  get cardRepository(): ICardRepository { ... }

  // NEW
  get followsRepository(): IFollowsRepository {
    return this._followsRepository ??= new DrizzleFollowsRepository(this.db);
  }
}
```

---

## Database Schema

### New Tables

```sql
-- Following relationships (polymorphic - supports users AND collections)
CREATE TABLE follows (
  follower_id TEXT NOT NULL,       -- DID of user who is following
  target_id TEXT NOT NULL,         -- ID of what's being followed (user DID or collection UUID)
  target_type TEXT NOT NULL,       -- 'USER' or 'COLLECTION'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, target_id, target_type)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_target ON follows(target_id, target_type);

-- Following feed items (fan-out target)
CREATE TABLE following_feed_items (
  user_id TEXT NOT NULL,           -- DID of feed owner
  activity_id UUID NOT NULL REFERENCES feed_activities(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL,   -- Denormalized from activity for sorting
  PRIMARY KEY (user_id, activity_id)
);

CREATE INDEX idx_following_feed_user_time ON following_feed_items(user_id, created_at DESC);
```

### New Repository: IFollowsRepository

**Note:** This repository only defines methods needed for feed fan-out. Follow/unfollow functionality is out of scope for this document.

```typescript
export interface Follow {
  followerId: string;
  targetId: string;
  targetType: 'USER' | 'COLLECTION';
}

export interface IFollowsRepository {
  // Get all followers of a specific user
  getFollowers(targetId: string, targetType: 'USER'): Promise<Result<Follow[]>>;

  // Get all followers of multiple collections (combined)
  getFollowersOfCollections(collectionIds: string[]): Promise<Result<Follow[]>>;
}
```

---

### New Repository Implementation: DrizzleFollowsRepository

```typescript
export class DrizzleFollowsRepository implements IFollowsRepository {
  constructor(private db: PostgresJsDatabase) {}

  async getFollowers(
    targetId: string,
    targetType: 'USER',
  ): Promise<Result<Follow[]>> {
    try {
      const results = await this.db
        .select()
        .from(follows)
        .where(
          and(
            eq(follows.target_id, targetId),
            eq(follows.target_type, targetType),
          ),
        );

      return ok(
        results.map((r) => ({
          followerId: r.follower_id,
          targetId: r.target_id,
          targetType: r.target_type as 'USER' | 'COLLECTION',
        })),
      );
    } catch (error) {
      return err(error as Error);
    }
  }

  async getFollowersOfCollections(
    collectionIds: string[],
  ): Promise<Result<Follow[]>> {
    try {
      if (collectionIds.length === 0) {
        return ok([]);
      }

      const results = await this.db
        .select()
        .from(follows)
        .where(
          and(
            sql`${follows.target_id} = ANY(${collectionIds}::text[])`,
            eq(follows.target_type, 'COLLECTION'),
          ),
        );

      return ok(
        results.map((r) => ({
          followerId: r.follower_id,
          targetId: r.target_id,
          targetType: r.target_type as 'USER' | 'COLLECTION',
        })),
      );
    } catch (error) {
      return err(error as Error);
    }
  }
}
```

---

### Updated FeedRepository: Add Fan-out Method

```typescript
// Add to IFeedRepository interface
export interface IFeedRepository {
  // ... existing methods ...

  fanOutActivityToFollowers(
    activityId: ActivityId,
    followerIds: string[],
    createdAt: Date,
  ): Promise<Result<void>>;
}

// DrizzleFeedRepository implementation
async fanOutActivityToFollowers(
  activityId: ActivityId,
  followerIds: string[],
  createdAt: Date,
): Promise<Result<void>> {
  try {
    if (followerIds.length === 0) {
      return ok(undefined);
    }

    const values = followerIds.map(userId => ({
      user_id: userId,
      activity_id: activityId.getStringValue(),
      created_at: createdAt,
    }));

    await this.db
      .insert(followingFeedItems)
      .values(values)
      .onConflictDoNothing(); // Idempotent (handles retries)

    return ok(undefined);
  } catch (error) {
    return err(error as Error);
  }
}
```

---

### Idempotency Handling

Both activity creation and fan-out use `ON CONFLICT DO NOTHING`:

```typescript
// FeedService.addCardCollectedActivity() uses distributed locking (ILockService) to prevent
// race conditions during check-and-insert. Lock key: feed:activity:{actorId}:{cardId}
// This ensures that concurrent events for the same card+actor are serialized.

// Additionally, activity lookup uses findRecentCardCollectedActivity (2-minute window)

// Fan-out is idempotent
await this.db.insert(followingFeedItems).values(values).onConflictDoNothing(); // Primary key (user_id, activity_id) prevents duplicates
```

**Result:** If event handler retries:

1. FeedService tries to acquire lock → either:
   - Gets lock immediately (first attempt), or
   - Waits for lock, then finds existing activity (created by previous attempt) → returns it
2. Activity creation finds existing activity via findRecentCardCollectedActivity → returns it
3. Fan-out silently skips duplicate rows (ON CONFLICT DO NOTHING) → succeeds
4. Use case completes successfully with idempotent behavior

---

## Query Pattern: Getting Following Feed

```typescript
async getFollowingFeed(
  userId: string,
  options: FeedQueryOptions,
): Promise<Result<PaginatedFeedResult>> {
  try {
    const { page, limit, beforeActivityId } = options;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [
      eq(followingFeedItems.user_id, userId)
    ];

    if (options.urlType) {
      whereConditions.push(eq(feedActivities.urlType, options.urlType));
    }

    if (options.source) {
      if (options.source === ActivitySource.SEMBLE) {
        whereConditions.push(sql`${feedActivities.source} IS NULL`);
      } else {
        whereConditions.push(eq(feedActivities.source, options.source));
      }
    }

    // Cursor-based pagination
    if (beforeActivityId) {
      const beforeActivity = await this.db
        .select({ createdAt: followingFeedItems.created_at })
        .from(followingFeedItems)
        .where(
          and(
            eq(followingFeedItems.user_id, userId),
            eq(followingFeedItems.activity_id, beforeActivityId.getStringValue())
          )
        )
        .limit(1);

      if (beforeActivity.length > 0) {
        whereConditions.push(
          lt(followingFeedItems.created_at, beforeActivity[0].createdAt)
        );
      }
    }

    // Main query with JOIN
    const activitiesResult = await this.db
      .select({
        id: feedActivities.id,
        actorId: feedActivities.actorId,
        cardId: feedActivities.cardId,
        type: feedActivities.type,
        metadata: feedActivities.metadata,
        urlType: feedActivities.urlType,
        source: feedActivities.source,
        createdAt: followingFeedItems.created_at, // Use denormalized timestamp
      })
      .from(followingFeedItems)
      .innerJoin(
        feedActivities,
        eq(feedActivities.id, followingFeedItems.activity_id)
      )
      .where(and(...whereConditions))
      .orderBy(
        desc(followingFeedItems.created_at),
        desc(followingFeedItems.activity_id)
      )
      .limit(limit)
      .offset(offset);

    // Count total (with same filters)
    const totalCountResult = await this.db
      .select({ count: count() })
      .from(followingFeedItems)
      .innerJoin(
        feedActivities,
        eq(feedActivities.id, followingFeedItems.activity_id)
      )
      .where(and(...whereConditions));

    const totalCount = totalCountResult[0]?.count || 0;

    // Map to domain objects (same as existing feeds)
    const activities = await this.mapToDomainActivities(activitiesResult);

    const hasMore = offset + activities.length < totalCount;
    const nextCursor = hasMore && activities.length > 0
      ? activities[activities.length - 1].activityId
      : undefined;

    return ok({
      activities,
      totalCount,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    return err(error as Error);
  }
}
```

**Index Usage:**

- `idx_following_feed_user_time` handles WHERE + ORDER BY efficiently
- JOIN to `feed_activities` uses primary key (fast)
- Additional filters (urlType, source) use existing indexes on `feed_activities`
