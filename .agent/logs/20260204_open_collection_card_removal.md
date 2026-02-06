# Open Collection Card Removal Analysis

**Date:** 2026-02-04
**Issue:** Cards being removed from open collections when users remove them from their library

---

## Original Issue

### Observed Behavior

When a user removed a card from their library, the card was also being removed from open collections, even when those collections were created and owned by other users.

**Example Scenario:**

- User A creates Open Collection X
- User B creates Card Y and adds it to Collection X
- User B removes Card Y from their library
- **Result:** Card Y disappears from Collection X (unexpected)

### Expected Behavior

When a user removes a card from their library:

- The card should only be removed from collections owned by the card's author
- Cards should remain in open collections created by other users

---

## Changes Made

### 1. CardLibraryService.ts

**File:** `src/modules/cards/domain/services/CardLibraryService.ts`

**Change:** Added conditional check to only remove from collections when the user removing the card is also the card author.

```typescript
// Only remove from collections if the user removing is the card author
// This ensures only card authors can clean up their own collections
if (card.curatorId.equals(curatorId)) {
  // Get all collections owned by the card's author that contain this card
  const collectionsResult =
    await this.collectionRepository.findByCuratorIdContainingCard(
      card.curatorId, // Changed from curatorId to card.curatorId
      card.cardId,
    );

  // ... remove from collections logic
}
```

**Before:** `findByCuratorIdContainingCard(curatorId, card.cardId)`

- Found collections owned by the person removing the card

**After:** Wrapped in conditional + `findByCuratorIdContainingCard(card.curatorId, card.cardId)`

- Only executes if person removing = card author
- Finds collections owned by the card author

### 2. Test Coverage Added

**File:** `src/modules/cards/tests/application/RemoveCardFromLibraryUseCase.test.ts`

Added three new test cases:

1. **"should not remove from collections when non-author removes card from library"**
   - Alice creates Card A and Collection X
   - Bob adds Card A to his library
   - Bob removes Card A from his library
   - ✅ Card A remains in Alice's Collection X

2. **"should not remove card from open collections owned by others when card author removes from library"**
   - Alice creates Card A
   - Bob creates Open Collection Y
   - Alice adds Card A to Bob's Collection Y
   - Alice removes Card A from her library
   - ⚠️ Card A gets deleted (CASCADE removes from Collection Y)

3. **"should only remove from author-owned collections, not from open collections by others"**
   - Alice creates Card A
   - Alice creates Collection X, Bob creates Collection Y
   - Alice adds Card A to both collections
   - Bob adds Card A to his library (prevents deletion)
   - Alice removes Card A from her library
   - ✅ Card removed from Collection X, remains in Collection Y

---

## Analysis of `findByCuratorIdContainingCard`

### Method Purpose

**File:** `src/modules/cards/infrastructure/repositories/DrizzleCollectionRepository.ts:298-391`

```typescript
async findByCuratorIdContainingCard(
  authorId: CuratorId,
  cardId: CardId,
): Promise<Result<Collection[]>>
```

### SQL Query Logic

```typescript
.where(
  and(
    eq(collections.authorId, authorIdString),  // Collection author = provided ID
    eq(collectionCards.cardId, cardIdString),  // Collection contains the card
  ),
);
```

Finds collections where:

- **Collection author** equals the provided `authorId` parameter
- **Collection contains** the specified `cardId`

### Conclusion

✅ **Method is working correctly.** It properly filters collections by author ID and did NOT contribute to removing cards from other users' collections through the collection cleanup logic.

---

## Root Cause Discovery: Card Deletion CASCADE

### The Real Culprit

The observed behavior of cards disappearing from other users' collections was NOT caused by the collection cleanup logic, but by **card deletion with database CASCADE**.

**File:** `src/modules/cards/application/useCases/commands/RemoveCardFromLibraryUseCase.ts:112-150`

```typescript
// Handle deletion with proper ordering for URL cards
if (updatedCard.libraryCount === 0 && updatedCard.curatorId.equals(curatorId)) {
  // Delete the card from the database
  const deleteResult = await this.cardRepository.delete(updatedCard.cardId);
}
```

### Deletion Flow

When a user removes a card from their library:

1. Card's `libraryCount` is decremented
2. If `libraryCount === 0` AND user is the card author:
   - Card is **deleted entirely** from the database
3. Database CASCADE (ON DELETE CASCADE) automatically removes the card from ALL collections
4. This includes collections owned by other users

### Example with CASCADE

**Scenario:**

- User B creates Card Y (User B is card author)
- User B adds Card Y to their library (libraryCount = 1)
- User A creates Open Collection X
- User B adds Card Y to Collection X
- User B removes Card Y from library

**What happens:**

1. Card Y's libraryCount becomes 0
2. User B is card author ✓
3. Card Y gets **DELETED**
4. Database CASCADE removes Card Y from Collection X
5. Card Y disappears from User A's collection

### Database Schema

**File:** `src/modules/cards/tests/test-utils/createTestSchema.ts`

```sql
CREATE TABLE IF NOT EXISTS collection_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,  -- CASCADE here!
  ...
)
```

When a card is deleted, `ON DELETE CASCADE` automatically removes all `collection_cards` entries.

---

## Current State

### What Our Changes Fixed ✅

1. **Collection cleanup logic now correct:**
   - Only card authors can trigger collection cleanup
   - Only removes from collections owned by the card author
   - Non-authors removing cards from their library doesn't affect any collections

2. **Test coverage:**
   - Comprehensive tests verify the new behavior
   - Edge cases covered (non-author removal, mixed collections, etc.)

### What Our Changes DID NOT Fix ⚠️

**Card deletion CASCADE still affects other users' collections:**

Even with our changes, cards are still removed from other users' collections when:

1. Card author removes the card from their library
2. Card's `libraryCount` drops to 0
3. Card gets deleted (because author is removing and libraryCount = 0)
4. CASCADE deletion removes from ALL collections, including those owned by others

**Example:**

- User B creates Card Y
- User B adds to their library (libraryCount = 1)
- User A adds Card Y to their Open Collection X
- User B removes Card Y from library
- Card Y deleted (libraryCount = 0, curator = owner)
- CASCADE removes from Collection X ❌

---

## Recommendations

### Option 1: Prevent Deletion if Card Exists in ANY Collections

**Change:** Don't delete cards if they exist in any collection, regardless of ownership.

```typescript
// Before deletion check:
const collections = await this.collectionRepository.findByCardId(card.cardId);
if (collections.length > 0) {
  // Don't delete - card is in use in collections
  return ok(card);
}

// Only delete if not in any collections
if (updatedCard.libraryCount === 0 && updatedCard.curatorId.equals(curatorId)) {
  // Safe to delete
}
```

**Pros:**

- Cards remain accessible in collections even if removed from all libraries
- Preserves curated collections

**Cons:**

- Cards may accumulate without being in any library
- Need cleanup mechanism for orphaned cards

### Option 2: Only Prevent if in Card Author's Collections

**Change:** Don't delete cards if they exist in collections owned by the card author.

```typescript
const authorCollections =
  await this.collectionRepository.findByCuratorIdContainingCard(
    card.curatorId,
    card.cardId,
  );

if (authorCollections.length > 0) {
  // Don't delete - card is in author's collections
  return ok(card);
}
```

**Pros:**

- Card authors maintain control over their own collections
- Still allows deletion if only in others' collections

**Cons:**

- Cards can still disappear from other users' collections
- Doesn't solve the original issue

### Option 3: Soft Delete with Visibility Flag

**Change:** Mark cards as "deleted" but keep them in database.

```typescript
// Instead of deleting:
card.markAsDeleted();
await this.cardRepository.save(card);

// Collections can still reference the card
// UI can choose to hide/show deleted cards
```

**Pros:**

- No CASCADE issues
- Collections maintain integrity
- Can implement "undelete" functionality

**Cons:**

- More complex implementation
- Need to handle deleted cards in queries

### Option 4: Collection-Based Ownership

**Change:** Cards exist as long as they're in at least one collection OR library.

```typescript
const totalReferences =
  updatedCard.libraryCount +
  (await this.collectionRepository.findByCardId(card.cardId)).length;

if (totalReferences === 0 && updatedCard.curatorId.equals(curatorId)) {
  // Only delete if not in ANY library or collection
  await this.cardRepository.delete(updatedCard.cardId);
}
```

**Pros:**

- Natural model - collections are "collections of cards"
- Solves the CASCADE issue
- Cards exist as long as they're referenced anywhere

**Cons:**

- Changes the ownership model
- Need to handle card updates when author removes from library

---

## Summary

### Key Findings

1. ✅ `findByCuratorIdContainingCard` is working correctly
2. ✅ Collection cleanup logic now only targets card author's collections
3. ⚠️ Card deletion CASCADE is the root cause of cards disappearing from other users' collections
4. ⚠️ Our changes fixed collection cleanup but NOT CASCADE deletion

### Next Decision Point

**Should cards be deleted when they exist in collections owned by other users?**

This is a product/design decision that affects:

- Card ownership model
- Collection integrity
- User expectations
- Database cleanup strategy

Current implementation: Cards are deleted when `libraryCount = 0` and user is card author, regardless of collection membership.

### Files Modified

- `src/modules/cards/domain/services/CardLibraryService.ts`
- `src/modules/cards/tests/application/RemoveCardFromLibraryUseCase.test.ts`

### Type Check

✅ All type checks pass: `npm run build:check`
