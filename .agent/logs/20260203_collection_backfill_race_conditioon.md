# Collection Backfill Race Condition Analysis

**Date:** 2026-02-03
**Issue:** Lost updates during concurrent collection item processing
**Status:** Root cause identified

---

## Executive Summary

During account data sync, when multiple collection items are added to the same collection concurrently, only the last item appears in the final result. This is caused by a **classic lost update race condition** in the collection repository's save method, which uses a DELETE-all-then-INSERT-all pattern that causes concurrent transactions to overwrite each other's changes.

**Expected:** Collection A has 3 items, Collection B has 2 items
**Actual:** Collection A has 1 item, Collection B has 1 item
**Data Lost:** 3 out of 5 collection items

---

## Problem Symptoms

From production logs, we can see:

```
[SYNC] [SYNC] Retrieved 5 records from at.margin.collectionItem (page 1)
[SYNC] [SYNC] Processing batch 1 (5 records) from page 1...

# All 5 items resolve successfully
[SYNC] [FirehoseWorker] Resolved Margin collection item - collectionId: 63d0727a..., cardId: 7c7ae767..., itemUri: ...3mdlhi4wewh2h
[SYNC] [FirehoseWorker] Resolved Margin collection item - collectionId: ce2891f7..., cardId: eca2df55..., itemUri: ...3mdykmh3pv22x
[SYNC] [FirehoseWorker] Resolved Margin collection item - collectionId: ce2891f7..., cardId: 0a23c9b0..., itemUri: ...3mdyknieydy2a
[SYNC] [FirehoseWorker] Resolved Margin collection item - collectionId: 63d0727a..., cardId: e8f84f9f..., itemUri: ...3mdvzqmvl6o2x
[SYNC] [FirehoseWorker] Resolved Margin collection item - collectionId: 63d0727a..., cardId: 9fd4381a..., itemUri: ...3mdykgokcyp2m

# All 5 successfully added
[SYNC] [FirehoseWorker] Successfully added Margin annotation to collection - user: did:plc:rlknsba2qldjkicxsmni3vyn, cardId: 7c7ae767..., collectionId: 63d0727a...
[SYNC] [FirehoseWorker] Successfully added Margin annotation to collection - user: did:plc:rlknsba2qldjkicxsmni3vyn, cardId: eca2df55..., collectionId: ce2891f7...
[SYNC] [FirehoseWorker] Successfully added Margin annotation to collection - user: did:plc:rlknsba2qldjkicxsmni3vyn, cardId: e8f84f9f..., collectionId: 63d0727a...
[SYNC] [FirehoseWorker] Successfully added Margin annotation to collection - user: did:plc:rlknsba2qldjkicxsmni3vyn, cardId: 0a23c9b0..., collectionId: ce2891f7...
[SYNC] [FirehoseWorker] Successfully added Margin annotation to collection - user: did:plc:rlknsba2qldjkicxsmni3vyn, cardId: 9fd4381a..., collectionId: 63d0727a...

[SYNC] [SYNC] Batch 1: processed 5/5 records
[SYNC] [SYNC] Processed 5 collection items
```

**Expected Distribution:**

- Collection `63d0727a`: 3 items (cards: 7c7ae767, e8f84f9f, 9fd4381a)
- Collection `ce2891f7`: 2 items (cards: eca2df55, 0a23c9b0)

**Actual Result:** Only 1 item in each collection (database query would show this)

---

## Root Cause: Lost Update Race Condition

The issue occurs because of concurrent processing combined with a problematic database update pattern.

### Concurrent Processing

**File:** `src/modules/sync/application/useCases/SyncAccountDataUseCase.ts`

**Lines 231-245:** Collection items are processed in batches with concurrent execution:

```typescript
// Process in batches of CONCURRENT_BATCH_SIZE
for (let i = 0; i < records.length; i += CONCURRENT_BATCH_SIZE) {
  const batch = records.slice(i, i + CONCURRENT_BATCH_SIZE);
  const batchNumber = Math.floor(i / CONCURRENT_BATCH_SIZE) + 1;

  console.log(
    `[SYNC] Processing batch ${batchNumber} (${batch.length} records) from page ${pageCount}...`,
  );

  // Process all records in this batch concurrently
  const results = await Promise.allSettled(
    batch.map((record) =>
      this.processRecord(record, useCase, curatorId, collectionType),
    ),
  );
  // ...
}
```

**Key Point:** `CONCURRENT_BATCH_SIZE = 10` (line 208), so up to 10 collection items process simultaneously.

---

### The Problematic Save Pattern

**File:** `src/modules/cards/infrastructure/repositories/DrizzleCollectionRepository.ts`

**Lines 504-529:** The save method uses a DELETE-all-then-INSERT-all pattern:

```typescript
async save(collection: Collection): Promise<Result<void, Error>> {
  // ... (earlier code preparing data)

  await this.db.transaction(async (tx) => {
    // ... (upsert collection record)

    // Delete existing collaborators and card links
    await tx
      .delete(collectionCollaborators)
      .where(eq(collectionCollaborators.collectionId, collectionData.id));

    await tx
      .delete(collectionCards)
      .where(eq(collectionCards.collectionId, collectionData.id));

    // Insert new collaborators
    if (collaborators.length > 0) {
      await tx.insert(collectionCollaborators).values(collaborators);
    }

    // Insert new card links with mapped published record IDs
    if (cardLinks.length > 0) {
      const cardLinksWithMappedRecords = cardLinks.map((link) => ({
        ...link,
        publishedRecordId: link.publishedRecordId
          ? linkPublishedRecordMap.get(link.publishedRecordId) ||
            link.publishedRecordId
          : undefined,
      }));

      await tx.insert(collectionCards).values(cardLinksWithMappedRecords);
    }
  });
}
```

**The Problem:** This pattern completely replaces all collection cards based on the in-memory collection state, regardless of what other concurrent transactions might be doing.

---

## Complete Code Flow

Here's the full path from sync to database for adding a collection item:

### 1. Sync Initiation

**File:** `src/modules/sync/application/useCases/SyncAccountDataUseCase.ts`

**Line 184-187:** Sync collection items (third phase after bookmarks and collections):

```typescript
// 3. Sync collection items (links cards to collections)
console.log(`[SYNC] Syncing collection items for ${curatorId}...`);
const itemsProcessed = await this.syncCollection(
  curatorId,
  ATPROTO_NSID.MARGIN.COLLECTION_ITEM,
  this.processMarginCollectionItemUseCase,
);
```

### 2. Process Individual Collection Item

**File:** `src/modules/atproto/application/useCases/ProcessMarginCollectionItemFirehoseEventUseCase.ts`

**Lines 152-162:** Call UpdateUrlCardAssociationsUseCase:

```typescript
const result = await this.updateUrlCardAssociationsUseCase.execute({
  cardId: cardId.value.getStringValue(),
  curatorId: curatorDid,
  addToCollections: [collectionId.value.getStringValue()],
  context: OperationContext.FIREHOSE_EVENT,
  publishedRecordIds: {
    collectionLinks: collectionLinkMap,
  },
  viaCardId: undefined,
  timestamp: timestamp,
});
```

### 3. Update URL Card Associations

**File:** `src/modules/cards/application/useCases/commands/UpdateUrlCardAssociationsUseCase.ts`

**Lines 314-321:** Call CardCollectionService to add card to collections:

```typescript
const addToCollectionsResult =
  await this.cardCollectionService.addCardToCollections(
    urlCard,
    collectionIds,
    curatorId,
    viaCardId,
    collectionOptions,
  );
```

### 4. Card Collection Service

**File:** `src/modules/cards/domain/services/CardCollectionService.ts`

**Lines 144-174:** Loop through collections and add card to each:

```typescript
async addCardToCollections(
  card: Card,
  collectionIds: CollectionId[],
  addedBy: string,
  viaCard?: CardId,
  options?: CollectionCardOptions,
): Promise<Result<Collection[], Error>> {
  const updatedCollections: Collection[] = [];

  for (const collectionId of collectionIds) {
    const result = await this.addCardToCollection(
      collectionId,
      card,
      addedBy,
      viaCard,
      options,
    );

    if (result.isErr()) {
      return err(result.error);
    }

    updatedCollections.push(result.value);
  }

  return ok(updatedCollections);
}
```

### 5. Add Card to Single Collection

**File:** `src/modules/cards/domain/services/CardCollectionService.ts`

**Lines 38-142:** The critical read-modify-write sequence:

```typescript
async addCardToCollection(
  collectionId: CollectionId,
  card: Card,
  addedBy: string,
  viaCard?: CardId,
  options?: CollectionCardOptions,
): Promise<Result<Collection, Error>> {
  // ... validation ...

  // 📖 READ: Fetch collection from database
  const collectionResult =
    await this.collectionRepository.findById(collectionId);
  if (collectionResult.isErr()) {
    return err(collectionResult.error);
  }
  const collection = collectionResult.value;
  if (!collection) {
    return err(new Error(`Collection with id ${collectionId} not found`));
  }

  // ... more validation ...

  // ✏️ MODIFY: Add card to in-memory collection
  const addCardResult = collection.addCard(
    card.id,
    addedBy,
    viaCard,
    options?.publishedRecordId,
    options?.timestamp,
  );

  if (addCardResult.isErr()) {
    return err(addCardResult.error);
  }

  // ... increment library count ...

  // 💾 WRITE: Save collection back to database
  const saveCollectionResult =
    await this.collectionRepository.save(collection);
  if (saveCollectionResult.isErr()) {
    return err(saveCollectionResult.error);
  }

  return ok(collection);
}
```

**Critical Issue:** This is a classic **Read-Modify-Write** pattern without any concurrency control!

### 6. Repository Save (The Problem!)

**File:** `src/modules/cards/infrastructure/repositories/DrizzleCollectionRepository.ts`

**Lines 504-511:** DELETE all existing cards:

```typescript
// Delete existing collaborators and card links
await tx
  .delete(collectionCollaborators)
  .where(eq(collectionCollaborators.collectionId, collectionData.id));

await tx
  .delete(collectionCards)
  .where(eq(collectionCards.collectionId, collectionData.id));
```

**Lines 514-529:** INSERT only what's in memory:

```typescript
// Insert new collaborators
if (collaborators.length > 0) {
  await tx.insert(collectionCollaborators).values(collaborators);
}

// Insert new card links with mapped published record IDs
if (cardLinks.length > 0) {
  const cardLinksWithMappedRecords = cardLinks.map((link) => ({
    ...link,
    publishedRecordId: link.publishedRecordId
      ? linkPublishedRecordMap.get(link.publishedRecordId) ||
        link.publishedRecordId
      : undefined,
  }));

  await tx.insert(collectionCards).values(cardLinksWithMappedRecords);
}
```

---

## Race Condition Timeline

Let's trace what happens when 3 concurrent transactions try to add different cards to Collection X:

### Initial State

- Collection X exists in database
- Collection X has 0 cards
- 3 collection items need to be added: Card-A, Card-B, Card-C

### Time T0: All Transactions Start

**Transaction 1:** Add Card-A to Collection X
**Transaction 2:** Add Card-B to Collection X
**Transaction 3:** Add Card-C to Collection X

All start concurrently via `Promise.allSettled()`.

### Time T1: READ Phase

**Transaction 1:**

```typescript
// CardCollectionService.ts line 54-58
const collectionResult = await this.collectionRepository.findById(collectionId);
// Returns: Collection X with cardLinks = []
```

**Transaction 2:**

```typescript
// CardCollectionService.ts line 54-58
const collectionResult = await this.collectionRepository.findById(collectionId);
// Returns: Collection X with cardLinks = []
```

**Transaction 3:**

```typescript
// CardCollectionService.ts line 54-58
const collectionResult = await this.collectionRepository.findById(collectionId);
// Returns: Collection X with cardLinks = []
```

**Result:** All 3 transactions see the same initial state (0 cards).

### Time T2: MODIFY Phase (In-Memory)

**Transaction 1:**

```typescript
// CardCollectionService.ts line 70-82
collection.addCard(cardA.id, ...);
// In-memory state: collection.cardLinks = [Card-A]
```

**Transaction 2:**

```typescript
// CardCollectionService.ts line 70-82
collection.addCard(cardB.id, ...);
// In-memory state: collection.cardLinks = [Card-B]
```

**Transaction 3:**

```typescript
// CardCollectionService.ts line 70-82
collection.addCard(cardC.id, ...);
// In-memory state: collection.cardLinks = [Card-C]
```

**Result:** Each transaction has modified its own in-memory copy independently.

### Time T3: WRITE Phase (Database Commits)

**Transaction 1 Commits First:**

```typescript
// DrizzleCollectionRepository.ts lines 504-529
await tx.delete(collectionCards).where(eq(collectionCards.collectionId, 'X'));
// Deletes: 0 rows
await tx.insert(collectionCards).values([Card - A]);
// Inserts: Card-A
```

**Database State:** Collection X has 1 card: [Card-A]

**Transaction 2 Commits Second:**

```typescript
// DrizzleCollectionRepository.ts lines 504-529
await tx.delete(collectionCards).where(eq(collectionCards.collectionId, 'X'));
// Deletes: 1 row (Card-A is deleted!) ⚠️
await tx.insert(collectionCards).values([Card - B]);
// Inserts: Card-B
```

**Database State:** Collection X has 1 card: [Card-B] (Card-A was lost!)

**Transaction 3 Commits Last:**

```typescript
// DrizzleCollectionRepository.ts lines 504-529
await tx.delete(collectionCards).where(eq(collectionCards.collectionId, 'X'));
// Deletes: 1 row (Card-B is deleted!) ⚠️
await tx.insert(collectionCards).values([Card - C]);
// Inserts: Card-C
```

**Database State:** Collection X has 1 card: [Card-C] (Card-A and Card-B were lost!)

### Final Result

- **Expected:** Collection X has 3 cards: [Card-A, Card-B, Card-C]
- **Actual:** Collection X has 1 card: [Card-C]
- **Lost:** Card-A and Card-B were successfully added in memory but deleted by subsequent transactions

### Why This Happens

The DELETE-all-then-INSERT-all pattern means:

1. Each transaction only knows about cards it added in memory
2. Each transaction deletes ALL cards currently in the database
3. Each transaction inserts only the cards from its in-memory state
4. Later commits overwrite earlier commits completely

---

## Missing Safeguards

### 1. No Database-Level Unique Constraint

**File:** `drizzle/0000_shocking_fenris.sql`

The migration file does NOT include a `UNIQUE(collection_id, card_id)` constraint on the `collection_cards` table, even though the test schema suggests one was intended.

**File:** `src/modules/cards/tests/test-utils/createTestSchema.ts` (line 49)

```typescript
sql`CREATE TABLE IF NOT EXISTS collection_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  added_by TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  via_card_id UUID REFERENCES cards(id),
  published_record_id UUID REFERENCES published_records(id),
  UNIQUE(collection_id, card_id)
)`,
```

**Issue:** The production schema doesn't enforce uniqueness, allowing duplicates if the code doesn't prevent them.

### 2. No Row-Level Locking

There's no `SELECT FOR UPDATE` in the repository's `findById` method to prevent concurrent reads of the same collection.

**File:** `src/modules/cards/infrastructure/repositories/DrizzleCollectionRepository.ts`

**Line 55-94:** Standard SELECT without locking:

```typescript
async findById(
  collectionId: CollectionId,
): Promise<Result<Collection | null, Error>> {
  try {
    const collectionResult = await this.db
      .select({
        id: collections.id,
        authorId: collections.authorId,
        // ... more fields
      })
      .from(collections)
      .where(eq(collections.id, collectionId.getStringValue()))
      .limit(1);

    // No .for('update') clause!
    // ...
  }
}
```

### 3. No Optimistic Concurrency Control

The `collections` table has no version column to detect concurrent modifications:

**File:** `src/modules/cards/infrastructure/repositories/schema/collection.sql.ts`

```typescript
export const collections = pgTable('collections', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: text('author_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  accessType: text('access_type').notNull(),
  cardCount: integer('card_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  publishedRecordId: uuid('published_record_id').references(
    () => publishedRecords.id,
  ),
  // No version column!
});
```

### 4. No Idempotent Inserts

The code doesn't use `INSERT ... ON CONFLICT` to make inserts idempotent and safe for concurrent execution.

---

## Solution Options

### Option 1: INSERT with ON CONFLICT (Recommended for Concurrency)

**Pros:**

- ✅ Allows true concurrent operations without blocking
- ✅ Database-enforced correctness via unique constraint
- ✅ Naturally idempotent - safe to retry
- ✅ Best performance for high-concurrency scenarios

**Cons:**

- ⚠️ Requires schema migration (add unique constraint)
- ⚠️ More complex repository logic to track additions vs. removals

**Implementation:**

1. **Add unique constraint to schema:**

   **File:** `src/modules/cards/infrastructure/repositories/schema/collection.sql.ts`

   ```typescript
   export const collectionCards = pgTable(
     'collection_cards',
     {
       // ... existing columns ...
     },
     (table) => ({
       uniqueCollectionCard: unique().on(table.collectionId, table.cardId),
     }),
   );
   ```

2. **Generate migration:** `npm run db:generate`

3. **Change repository save method:**

   **File:** `src/modules/cards/infrastructure/repositories/DrizzleCollectionRepository.ts`

   ```typescript
   // Instead of DELETE + INSERT, use INSERT ON CONFLICT
   if (cardLinks.length > 0) {
     await tx
       .insert(collectionCards)
       .values(cardLinksWithMappedRecords)
       .onConflictDoUpdate({
         target: [collectionCards.collectionId, collectionCards.cardId],
         set: {
           publishedRecordId: sql`EXCLUDED.published_record_id`,
           addedAt: sql`EXCLUDED.added_at`,
           addedBy: sql`EXCLUDED.added_by`,
           viaCardId: sql`EXCLUDED.via_card_id`,
         },
       });
   }
   ```

4. **Track and delete removed cards separately** (if needed for card removal functionality)

---

### Option 2: SELECT FOR UPDATE Locking (Simplest but Serializes)

**Pros:**

- ✅ Simple to implement
- ✅ No schema changes needed
- ✅ Guarantees serial access to collections

**Cons:**

- ⚠️ Serializes all updates to the same collection (slower)
- ⚠️ Potential for deadlocks if not careful
- ⚠️ Reduced concurrency

**Implementation:**

**File:** `src/modules/cards/infrastructure/repositories/DrizzleCollectionRepository.ts`

In `findById` method, add row-level locking:

```typescript
async findById(
  collectionId: CollectionId,
): Promise<Result<Collection | null, Error>> {
  try {
    const collectionResult = await this.db
      .select({...})
      .from(collections)
      .where(eq(collections.id, collectionId.getStringValue()))
      .for('update')  // ← Add this line
      .limit(1);
    // ...
  }
}
```

This forces concurrent transactions to wait in line, preventing the race condition but reducing throughput.

---

### Option 3: Application-Level Grouping (No DB Changes)

**Pros:**

- ✅ No database schema changes
- ✅ No repository changes

**Cons:**

- ⚠️ Requires changes in sync use case
- ⚠️ More complex application logic
- ⚠️ Doesn't prevent races from other code paths (e.g., firehose)

**Implementation:**

**File:** `src/modules/sync/application/useCases/SyncAccountDataUseCase.ts`

Group collection items by collection before processing:

```typescript
private async syncCollection(...): Promise<number> {
  // ... fetch records ...

  // Group items by collection
  const itemsByCollection = new Map<string, any[]>();
  for (const record of records) {
    const collectionId = extractCollectionId(record); // Helper function
    if (!itemsByCollection.has(collectionId)) {
      itemsByCollection.set(collectionId, []);
    }
    itemsByCollection.get(collectionId)!.push(record);
  }

  // Process each collection's items sequentially
  for (const [collectionId, items] of itemsByCollection) {
    for (const item of items) {
      await this.processRecord(item, useCase, curatorId, collectionType);
    }
  }
}
```

---

### Option 4: Optimistic Concurrency Control (Version Column)

**Pros:**

- ✅ Detects conflicts explicitly
- ✅ No blocking/locking

**Cons:**

- ⚠️ Requires retry logic and error handling
- ⚠️ Schema changes needed (version column)
- ⚠️ More complex to implement correctly

**Implementation:** Add a `version` column to collections table and check it during updates.

---

## Recommended Approach

**Use Option 1: INSERT with ON CONFLICT**

This is the most robust solution for a concurrent, distributed system:

1. **Add UNIQUE constraint** to `collection_cards` table
2. **Change save method** to use `INSERT ... ON CONFLICT`
3. **Maintain concurrent processing** in sync use case
4. **Ensure idempotency** across all code paths

**Why this is best:**

- Handles concurrent operations from both sync AND firehose
- Database enforces correctness (no silent data loss)
- Scales well with high concurrency
- Aligns with the domain model (Collection already prevents duplicate cards)

---

## Additional Notes

### Why Tests Didn't Catch This

**File:** `src/modules/cards/tests/test-utils/createTestSchema.ts` (line 49)

The test schema DOES include `UNIQUE(collection_id, card_id)`, which would have helped catch this issue:

```typescript
UNIQUE(collection_id, card_id);
```

However, the production migration doesn't have this constraint, creating a gap between test and production schemas.

### Schema Drift

There's a discrepancy between:

- **Production schema:** `drizzle/0000_shocking_fenris.sql` (no unique constraint)
- **Test schema:** `createTestSchema.ts` (has unique constraint)

This drift should be resolved to ensure test environments match production.

---

## Conclusion

The root cause is a **lost update race condition** caused by:

1. Concurrent processing of collection items
2. Read-Modify-Write pattern without concurrency control
3. DELETE-all-then-INSERT-all repository save pattern

The recommended fix is to use **INSERT with ON CONFLICT**, which provides:

- Database-level concurrency safety
- Idempotent operations
- Maximum throughput for concurrent operations

Implementation requires:

- Schema migration to add unique constraint
- Repository method refactoring to use ON CONFLICT
- Alignment of test and production schemas
