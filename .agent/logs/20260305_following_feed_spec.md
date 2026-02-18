# Following Feed Implementation Specification

**Date:** 2026-03-05
**Status:** Planning
**Architecture:** Application-level fan-out

**Scope:** This document covers how to add activities to following feeds and how to fetch them. Follow/unfollow functionality is **out of scope** and will be handled separately.

---

## Overview

The following feed extends the existing event-driven feed activity system. Activities are already created asynchronously via `CARD_ADDED_TO_LIBRARY` and `CARD_ADDED_TO_COLLECTION` events. We will perform **application-level synchronous fan-out** after activity creation.

**Key Design:** Event handlers call `AddActivityToFeedUseCase` directly (no saga). The use case coordinates:

1. Activity creation (with distributed locking via `ILockService` to prevent race conditions)
2. Following feed fan-out (fetching followers and inserting into following feed)

**Following Targets:** Users can follow both **users** AND **collections**, so fan-out must consider:

- Followers of the actor (user who created the activity)
- Followers of the collections (if the activity includes collections)

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

### Why This Schema?

1. **`follows` table (Polymorphic):**
   - Stores who follows what (users OR collections)
   - `target_type` distinguishes between following a user vs a collection
   - Single table keeps queries simple (one lookup for all followers)
   - Alternative: separate `user_follows` and `collection_follows` tables (more normalized, but requires 2 queries)

2. **`following_feed_items` table:**
   - Stores the fan-out results
   - Each row = "this activity should appear in this user's following feed"
   - Same structure regardless of whether activity came from following a user or collection

3. **Denormalized `created_at`:**
   - Avoids JOIN to `feed_activities` for sorting queries
   - Small storage cost for massive read performance gain

4. **ON DELETE CASCADE:**
   - When an activity is deleted, automatically remove from all following feeds

---

## Flow from Event to Following Feed

### Current Flow (After Saga Removal)

```
Event: CARD_ADDED_TO_LIBRARY
  ↓
CardAddedToLibraryEventHandler
  ↓
AddActivityToFeedUseCase.execute()
  ↓
FeedService.addCardCollectedActivity()
  ├─ [ACQUIRE DISTRIBUTED LOCK via ILockService]
  ├─ [CHECK for recent activity]
  ├─ [INSERT or UPDATE feed_activities]
  └─ [RELEASE DISTRIBUTED LOCK]
  ↓
DrizzleFeedRepository.addActivity()
  ↓
INSERT INTO feed_activities (...)
```

### New Flow (With Following Feed)

```
Event: CARD_ADDED_TO_LIBRARY
  ↓
CardAddedToLibraryEventHandler
  ↓
AddActivityToFeedUseCase.execute()
  ├─ FeedService.addCardCollectedActivity()
  │  ├─ [ACQUIRE DISTRIBUTED LOCK]
  │  ├─ [CHECK for recent activity]
  │  └─ [INSERT or UPDATE feed_activities]
  │
  ├─ FollowsRepository.getFollowers(actorId, 'USER')
  │
  ├─ FollowsRepository.getFollowersOfCollections(collectionIds)
  │
  ├─ Combine & deduplicate follower lists
  │
  └─ FeedRepository.fanOutActivityToFollowers()
     └─ INSERT INTO following_feed_items (user_id, activity_id, created_at)
        VALUES (...follower_ids..., activity_id, created_at)
        ON CONFLICT DO NOTHING
```

**Key Points:**

- ✅ Activity creation is protected by distributed lock (prevents race conditions)
- ✅ No additional async layer needed (already in event handler)
- ✅ Fan-out happens at application level after activity creation
- ✅ If either activity creation or fan-out fails, event handler retries entire use case
- ✅ Both operations are idempotent (ON CONFLICT DO NOTHING) for retry safety

---

## Application-Level Fan-out Design

Fan-out happens in `AddActivityToFeedUseCase.execute()` by orchestrating multiple repository calls.

```typescript
// AddActivityToFeedUseCase.execute()
async execute(request: AddActivityToFeedDTO): Promise<Result<...>> {
  // ... validation (existing code) ...

  // 1. Create activity WITHOUT fan-out
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

  // 2. Get followers of the actor (user)
  const userFollowersResult = await this.followsRepository.getFollowers(
    actorId.value,
    'USER'
  );

  const userFollowers = userFollowersResult.isOk()
    ? userFollowersResult.value
    : [];

  // 3. Get followers of collections (if any)
  let collectionFollowers: string[] = [];
  if (collectionIds && collectionIds.length > 0) {
    const collectionIdStrings = collectionIds.map(id => id.getStringValue());
    const collectionFollowersResult =
      await this.followsRepository.getFollowersOfCollections(collectionIdStrings);

    collectionFollowers = collectionFollowersResult.isOk()
      ? collectionFollowersResult.value
      : [];
  }

  // 4. Combine and dedupe
  const allFollowers = new Set([...userFollowers, ...collectionFollowers]);

  // 5. Fan-out to all followers
  if (allFollowers.size > 0) {
    await this.feedRepository.fanOutActivityToFollowers(
      activity.activityId,
      Array.from(allFollowers),
      activity.createdAt,
    );
  }

  return ok({
    activityId: activity.activityId.getStringValue(),
  });
}
```

**Why Application-Level:**

- ✅ Proper separation of concerns (use case orchestrates, repositories handle data)
- ✅ Full context available for business decisions (can add conditional logic based on source, type, etc.)
- ✅ Easier to test (can mock each repository call independently)
- ✅ Repositories stay simple (data access only, no business logic)

**Handling Non-Atomicity:**

We mitigate this with:

1. **Idempotent operations:** Both activity creation and fan-out use `ON CONFLICT DO NOTHING`
2. **Event retries:** If fan-out fails, BullMQ retries the entire use case
3. **Distributed locking:** FeedService uses ILockService to prevent race conditions during activity creation

**Result:** If event handler retries:

1. Activity creation finds existing activity via distributed lock + 2-minute window check → returns it
2. Fan-out silently skips duplicate rows (ON CONFLICT DO NOTHING) → succeeds
3. Use case completes successfully with idempotent behavior

---

## Application-Level Implementation

### Updated Use Case: AddActivityToFeedUseCase

```typescript
export class AddActivityToFeedUseCase implements UseCase<...> {
  constructor(
    private feedService: FeedService,
    private cardRepository: ICardRepository,
    private followsRepository: IFollowsRepository, // NEW
    private feedRepository: IFeedRepository,       // NEW (for fan-out)
  ) {}

  async execute(request: AddActivityToFeedDTO): Promise<Result<...>> {
    try {
      // ... existing validation (actorId, cardId, collectionIds) ...

      // ... existing card fetch logic ...

      // 1. Create activity in global feed (no fan-out yet)
      // Note: FeedService internally uses distributed locking (via ILockService) during check-and-insert
      // to prevent race conditions when multiple events arrive for the same card+actor
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

      // 2. Get followers of the actor (user who created activity)
      const userFollowersResult = await this.followsRepository.getFollowers(
        actorId.value,
        'USER'
      );

      const userFollowers = userFollowersResult.isOk()
        ? userFollowersResult.value.map(f => f.followerId)
        : [];

      // 3. Get followers of collections (if any)
      let collectionFollowers: string[] = [];
      if (collectionIds && collectionIds.length > 0) {
        const collectionIdStrings = collectionIds.map(id => id.getStringValue());
        const collectionFollowersResult =
          await this.followsRepository.getFollowersOfCollections(collectionIdStrings);

        collectionFollowers = collectionFollowersResult.isOk()
          ? collectionFollowersResult.value.map(f => f.followerId)
          : [];
      }

      // 4. Combine and deduplicate
      const allFollowerIds = new Set([...userFollowers, ...collectionFollowers]);

      // 5. Fan-out to all followers
      if (allFollowerIds.size > 0) {
        const fanOutResult = await this.feedRepository.fanOutActivityToFollowers(
          activity.activityId,
          Array.from(allFollowerIds),
          activity.createdAt,
        );

        if (fanOutResult.isErr()) {
          // Log error - event handler will retry entire use case if critical
          // Distributed lock in FeedService ensures no duplicate activities
          console.error('Fan-out failed:', fanOutResult.error);
        }
      }

      return ok({
        activityId: activity.activityId.getStringValue(),
      });
    } catch (error) {
      return err(AppError.UnexpectedError.create(error));
    }
  }
}
```

---

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

---

## Performance Analysis

### Write Performance (Fan-out)

**Scenario:** User with 1,000 followers posts an activity

| Approach                 | Database Operations                      | Estimated Time |
| ------------------------ | ---------------------------------------- | -------------- |
| **Option A (2 queries)** | 1 INSERT + 1 SELECT + 1 INSERT (1k rows) | ~30-50ms       |
| **Option B (CTE)**       | 1 combined query                         | ~20-40ms       |

**Bottleneck:** Not the DB, but finding follower IDs. With proper index (`idx_follows_following`), this is O(1) lookup.

**Scaling:**

- 100 followers: ~10ms
- 1,000 followers: ~40ms
- 10,000 followers: ~300ms (still acceptable for async event handler)
- 100,000 followers: ~3s (need optimization - see below)

### Read Performance (Query Following Feed)

**Scenario:** User queries their following feed (page 1, 20 items)

| Operation              | Strategy                                         | Estimated Time |
| ---------------------- | ------------------------------------------------ | -------------- |
| **Filter by user**     | `idx_following_feed_user_time` (index-only scan) | ~1ms           |
| **Sort by time**       | Already in index order                           | 0ms            |
| **JOIN to activities** | Primary key lookup (20 items)                    | ~1ms           |
| **Total**              |                                                  | **~2-5ms**     |

**Comparison to other feeds:**

- Global feed: ~2-5ms (same)
- Gems feed: ~5-10ms (JSONB filtering slower)
- Following feed: ~2-5ms ✅

---

## Edge Cases & Considerations

### 1. **What if user has no followers?**

```sql
SELECT follower_id FROM follows WHERE target_id = ? AND target_type = 'USER'
-- Returns empty result set
-- INSERT following_feed_items skipped (no rows)
```

✅ Works fine, no fan-out occurs.

### 2. **What if fan-out operation fails?**

If fan-out fails (e.g., DB connection lost):

1. Activity is already created in global feed
2. Event handler throws error
3. BullMQ retries the event
4. Activity creation finds existing activity (via distributed lock + 2-minute window)
5. Fan-out retries and succeeds (idempotent with ON CONFLICT DO NOTHING)

✅ Eventual consistency with retries.

### 3. **Duplicate activities in following feed?**

Can't happen:

- Primary key `(user_id, activity_id)` prevents duplicates
- Fan-out uses `ON CONFLICT DO NOTHING` for idempotency

```typescript
await tx.insert(followingFeedItems).values(fanOutValues).onConflictDoNothing();
```

---

## Optimizations for High Follower Counts

### When user has > 10,000 followers:

**Problem:** Fan-out takes > 1 second, blocks event handler

**Solution: Hybrid approach**

```typescript
const SYNC_FANOUT_THRESHOLD = 5000;

async addActivity(activity: FeedActivity): Promise<Result<void>> {
  await this.db.transaction(async (tx) => {
    // 1. Always insert activity
    await tx.insert(feedActivities).values(...);

    // 2. Count followers
    const followerCount = await tx
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.following_id, dto.actorId));

    if (followerCount[0].count < SYNC_FANOUT_THRESHOLD) {
      // 3a. Small follower count: fan-out synchronously
      await tx.execute(sql`INSERT INTO following_feed_items ...`);
    } else {
      // 3b. Large follower count: queue background job
      await this.queueFanoutJob(dto.id, dto.actorId);
    }
  });
}
```

**For medium scale (< 100k users):** Sync approach is fine. This optimization can wait.

---

## Summary: Implementation Changes Required

### Database Changes

**New Tables (2):**

1. **`follows`** - Polymorphic table for following users AND collections
   - `follower_id` (TEXT) - User doing the following
   - `target_id` (TEXT) - User DID or Collection UUID being followed
   - `target_type` (TEXT) - 'USER' or 'COLLECTION'
   - Primary key: `(follower_id, target_id, target_type)`

2. **`following_feed_items`** - Fan-out target table
   - `user_id` (TEXT) - Feed owner
   - `activity_id` (UUID) - Reference to feed_activities
   - `created_at` (TIMESTAMP) - Denormalized for sorting
   - Primary key: `(user_id, activity_id)`

### Application Layer Changes

**New Repository (1):**

- **`IFollowsRepository` / `DrizzleFollowsRepository`**
  - `getFollowers(targetId, targetType)` - Get followers of a user
  - `getFollowersOfCollections(collectionIds[])` - Get followers of multiple collections

**Updated Repository (1):**

- **`IFeedRepository` / `DrizzleFeedRepository`**
  - Add: `fanOutActivityToFollowers(activityId, followerIds[], createdAt)` - Insert into following_feed_items
  - Add: `getFollowingFeed(userId, options)` - Query following feed (similar to getGemsFeed)

**Updated Use Case (1):**

- **`AddActivityToFeedUseCase`**
  - Add `followsRepository` to constructor
  - Add `feedRepository` to constructor (for fan-out)
  - After creating activity:
    1. Get followers of actor (user)
    2. Get followers of collections (if any)
    3. Combine and dedupe
    4. Call `fanOutActivityToFollowers()`

### Key Design Principles

1. ✅ **Application-level fan-out** - Use case orchestrates, repositories handle data
2. ✅ **Distributed locking** - FeedService uses ILockService to prevent race conditions during activity creation
3. ✅ **Idempotency** - Both activity creation and fan-out use `ON CONFLICT DO NOTHING` for retry safety
4. ✅ **Polymorphic follows** - Single table supports both user and collection follows
5. ✅ **Eventual consistency** - Event retries handle failures gracefully

---

## Implementation Steps

### Phase 1: Database Schema

1. **Create migration** for `follows` and `following_feed_items` tables
2. **Update** `createTestSchema.ts` with new tables and indexes
3. **Generate migration** with `npm run db:generate`
4. **Apply migration** to development database

### Phase 2: Repositories

1. **Create** `IFollowsRepository` interface with `getFollowers()` and `getFollowersOfCollections()`
2. **Implement** `DrizzleFollowsRepository`
3. **Update** `IFeedRepository` with `fanOutActivityToFollowers()` and `getFollowingFeed()`
4. **Implement** new methods in `DrizzleFeedRepository`
5. **Add** repository instances to `RepositoryFactory`

### Phase 3: Use Case Updates

1. **Update** `AddActivityToFeedUseCase` constructor to include `followsRepository` and `feedRepository`
2. **Add** fan-out logic after activity creation (as shown in implementation section)
3. **Update** `UseCaseFactory` to inject new dependencies

### Phase 4: Feed Query API

1. **Create** `GetFollowingFeedUseCase` (similar to existing feed use cases)
2. **Add** HTTP route and controller for following feed query

### Phase 5: Testing

1. **Unit tests** for `DrizzleFollowsRepository`
2. **Unit tests** for fan-out logic in `AddActivityToFeedUseCase`
3. **Integration tests** for complete flow (event → activity → fan-out)
4. **Performance tests** with various follower counts (100, 1k, 10k)
5. **Test retry scenarios** (ensure idempotency works)
6. **Run** `npm run build:check` to verify no type errors

---

## Open Questions

1. **Following feed filters:** Should following feed support same filters as global feed?
   - `urlType` filter (show only articles, videos, etc.)
   - `source` filter (show only Semble, Margin, etc.)

2. **Conditional fan-out:** Should certain activities NOT be fanned out?
   - Example: "Don't fan-out Margin activities to collection followers" (only to user followers)
   - Application-level approach makes this easy to implement

3. **Performance optimization threshold:** At what follower count should we implement async fan-out?
   - Current plan: Sync fan-out for all users
   - Future consideration: Hybrid approach for users with > 10k followers
