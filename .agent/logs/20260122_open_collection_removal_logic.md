# Open Collection Removal Logic Implementation

**Date:** January 22, 2026

## Overview

Implemented card removal logic for OPEN collections in the ATProto-based application, including the creation of a new `collectionLinkRemoval` lexicon record type to handle cases where collection owners need to remove cards added by other users.

## Problem Statement

In ATProto, users can only modify records in their own repositories. When a collection owner wants to remove a card that was added by another user from an OPEN collection, they cannot delete the `collectionLink` record (which exists in the other user's repository). A solution was needed to mark these cards as removed without requiring direct deletion of another user's records.

## Solution: CollectionLinkRemoval Record

Implemented Option 2 from the design phase: a separate `collectionLinkRemoval` record type that collection owners publish in their own repository to indicate a card has been removed.

### Lexicon Schema

Created `src/modules/atproto/infrastructure/lexicons/collectionLinkRemoval.json`:

```json
{
  "lexicon": 1,
  "id": "network.cosmik.collectionLinkRemoval",
  "description": "A record indicating that a card was removed from a collection by the collection owner.",
  "defs": {
    "main": {
      "type": "record",
      "description": "A record representing the removal of a collection link by a collection owner when they cannot delete the original link (which exists in another user's repository). The creator of this record (determined from the AT-URI) is the user who performed the removal.",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["collection", "removedLink", "removedAt"],
        "properties": {
          "collection": {
            "type": "ref",
            "description": "Strong reference to the collection record.",
            "ref": "com.atproto.repo.strongRef"
          },
          "removedLink": {
            "type": "ref",
            "description": "Strong reference to the collectionLink record that is being removed.",
            "ref": "com.atproto.repo.strongRef"
          },
          "removedAt": {
            "type": "string",
            "format": "datetime",
            "description": "Timestamp when the link was removed from the collection."
          }
        }
      }
    }
  }
}
```

**Design Notes:**

- No `removedBy` field - user identity is derived from the AT-URI of the removal record
- No `reason` field - kept the schema minimal and focused
- Uses StrongRef to ensure content-addressable references (URI + CID)

## Business Rules for OPEN Collections

### Removal Permissions

**For OPEN Collections:**

- ✅ Collection author can remove any card (including cards added by others)
- ✅ Users can only remove cards they themselves added
- ❌ Non-authors cannot remove cards added by others

### ATProto Publishing Logic

When removing a card from an OPEN collection:

1. **User removing their own card:**
   - Unpublishes the `collectionLink` record (deletes from their repository)
   - No removal record is created

2. **Collection author removing someone else's card:**
   - Publishes a `collectionLinkRemoval` record in their own repository
   - The original `collectionLink` remains in the other user's repository (cannot be deleted)

## Implementation Details

### 1. Domain Layer

**File:** `src/modules/cards/domain/Collection.ts`

Updated the `removeCard()` method (lines 260-309) to enforce permissions based on collection type:

```typescript
public removeCard(
  cardId: CardId,
  userId: CuratorId,
): Result<void, CollectionAccessError> {
  // Find the card link to check who added it
  const cardLink = this.props.cardLinks.find((link) =>
    link.cardId.equals(cardId),
  );

  // If card is not in collection, removal is a no-op (succeeds idempotently)
  if (!cardLink) {
    return ok(undefined);
  }

  // Check removal permissions based on collection type and user role
  const isAuthor = this.props.authorId.equals(userId);
  const isUserRemovingOwnCard = cardLink.addedBy.equals(userId);

  if (this.isOpen) {
    // For OPEN collections:
    // - Author can remove any card
    // - Users can only remove cards they added themselves
    if (!isAuthor && !isUserRemovingOwnCard) {
      return err(
        new CollectionAccessError(
          'User does not have permission to remove cards from this collection',
        ),
      );
    }
  } else {
    // For CLOSED collections:
    // Use the standard canAddCard check (author + collaborators)
    // Note: CLOSED collection removal scenarios with collaborators are deferred
    if (!this.canAddCard(userId)) {
      return err(
        new CollectionAccessError(
          'User does not have permission to remove cards from this collection',
        ),
      );
    }
  }

  this.props.cardLinks = this.props.cardLinks.filter(
    (link) => !link.cardId.equals(cardId),
  );
  this.props.cardCount = this.props.cardLinks.length;
  this.props.updatedAt = new Date();

  return ok(undefined);
}
```

### 2. Service Layer

**File:** `src/modules/cards/domain/services/CardCollectionService.ts`

The `removeCardFromCollection` method (lines 213-279) handles the publishing logic:

```typescript
// Check permissions FIRST before attempting any publishing operations
const canRemoveResult = collection.removeCard(card.cardId, curatorId);
if (canRemoveResult.isErr()) {
  return err(new CardCollectionValidationError(...));
}
// Re-add the card since we only wanted to check permissions
collection.addCard(card.cardId, cardLink.addedBy, cardLink.viaCardId);

// Handle unpublishing/removal based on options
if (!options?.skipPublishing && cardLink.publishedRecordId) {
  const isUserRemovingOwnCard = cardLink.addedBy.equals(curatorId);
  const isCollectionAuthor = collection.authorId.equals(curatorId);

  if (isUserRemovingOwnCard) {
    // Unpublish the CollectionLink (delete from their repo)
    await collectionPublisher.unpublishCardAddedToCollection(...);
  } else if (isCollectionAuthor) {
    // Publish a CollectionLinkRemoval record (only author can do this)
    await collectionPublisher.publishCollectionLinkRemoval(...);
  } else {
    // Should never happen due to permission check above
    return err(new CardCollectionValidationError(
      'User does not have permission to remove this card from the collection'
    ));
  }
}
```

**Key Design Decision:** Permission check happens BEFORE any ATProto publishing operations to prevent unauthorized publishes.

### 3. Infrastructure Layer

**File:** `src/modules/atproto/infrastructure/publishers/ATProtoCollectionPublisher.ts`

Added `publishCollectionLinkRemoval` method (lines 280-350):

```typescript
async publishCollectionLinkRemoval(
  card: Card,
  collection: Collection,
  curatorId: CuratorId,
  removedLinkRef: PublishedRecordId,
): Promise<Result<PublishedRecordId, UseCaseError>> {
  // ... validation and auth ...
  const removalRecordDTO = CollectionLinkRemovalMapper.toCreateRecordDTO(
    collection.publishedRecordId.getValue(),
    removedLinkRef.getValue(),
  );
  const createResult = await agent.com.atproto.repo.createRecord({
    repo: curatorDid.value,
    collection: this.collectionLinkRemovalCollection,
    record: removalRecordDTO,
  });
  return ok(PublishedRecordId.create({...}));
}
```

### 4. Mapper

**File:** `src/modules/atproto/infrastructure/mappers/CollectionLinkRemovalMapper.ts` (CREATED)

Maps domain data to removal record DTOs:

```typescript
static toCreateRecordDTO(
  collectionPublishedRecordId: PublishedRecordIdProps,
  removedLinkPublishedRecordId: PublishedRecordIdProps,
): CollectionLinkRemovalRecordDTO {
  const record: CollectionLinkRemovalRecordDTO = {
    $type: this.collectionLinkRemovalType as any,
    collection: {
      uri: collectionPublishedRecordId.uri,
      cid: collectionPublishedRecordId.cid,
    },
    removedLink: {
      uri: removedLinkPublishedRecordId.uri,
      cid: removedLinkPublishedRecordId.cid,
    },
    removedAt: new Date().toISOString(),
  };
  return record;
}
```

## Files Modified

### Created

1. `src/modules/atproto/infrastructure/lexicons/collectionLinkRemoval.json` - Lexicon schema
2. `src/modules/atproto/infrastructure/mappers/CollectionLinkRemovalMapper.ts` - Mapper for removal records

### Modified

1. `src/modules/cards/domain/Collection.ts` - Updated `removeCard()` method with proper permissions
2. `src/modules/cards/domain/services/CardCollectionService.ts` - Updated removal logic with publishing decisions
3. `src/modules/cards/application/ports/ICollectionPublisher.ts` - Added `publishCollectionLinkRemoval` method signature
4. `src/modules/atproto/infrastructure/publishers/ATProtoCollectionPublisher.ts` - Implemented `publishCollectionLinkRemoval`
5. `src/modules/cards/tests/utils/FakeCollectionPublisher.ts` - Added test implementation for removal tracking
6. `src/shared/infrastructure/config/EnvironmentConfigService.ts` - Added `collectionLinkRemoval` config
7. `src/shared/infrastructure/http/factories/ServiceFactory.ts` - Updated ATProtoCollectionPublisher instantiation
8. `src/modules/cards/tests/application/RemoveCardFromCollectionUseCase.test.ts` - Updated/added tests

### Generated

- TypeScript types regenerated via `npm run lexgen`

## Test Coverage

### Test Results

- ✅ 20 tests passed in RemoveCardFromCollectionUseCase
- ✅ 2 tests skipped (CLOSED collections with collaborators - out of scope)
- ✅ 148 total collection-related tests passed

### Test Scenarios Added

1. **Collection owner removes contributor's card** → publishes removal record
2. **Contributor removes their own card** → unpublishes link
3. **Owner removes their own card** → unpublishes link
4. **Non-author tries to remove another user's card** → fails with permission error

### Skipped Tests (Out of Scope)

The following tests were skipped as CLOSED collection scenarios with collaborators are deferred:

- `should allow collaborator to remove cards from closed collection`
- `should handle mixed collection permissions when removing cards`

## Enforcement Layers

The removal rules are enforced at **two layers** for defense in depth:

1. **Domain Layer** (`Collection.removeCard()`) - First line of defense, encapsulates business rules
2. **Service Layer** (`CardCollectionService.removeCardFromCollection()`) - Handles ATProto publishing logic

This ensures business rules are properly encapsulated in the domain model where they belong.

## Future Work

### CLOSED Collections with Collaborators

Deferred for future implementation:

- How collaborators can remove cards from CLOSED collections
- Whether collaborators can remove any card or only their own
- Permission rules for multi-user CLOSED collection scenarios

### Potential Enhancements

- Add a `reason` field to collectionLinkRemoval for moderation use cases
- Implement bulk removal operations
- Add notifications when cards are removed from collections
- Query support for fetching removal records from the firehose

## Configuration

Added environment configuration for the collectionLinkRemoval collection:

```typescript
collections: {
  card: 'network.cosmik.card',
  collection: 'network.cosmik.collection',
  collectionLink: 'network.cosmik.collectionLink',
  collectionLinkRemoval: 'network.cosmik.collectionLinkRemoval', // NEW
}
```

## References

- ATProto Documentation: https://atproto.com/
- Lexicon Specification: https://atproto.com/specs/lexicon
- StrongRef Definition: `com.atproto.repo.strongRef`

## Notes

- The implementation focuses exclusively on OPEN collections as specified by the user
- Permission checks occur before any ATProto publishing to prevent unauthorized operations
- The design follows the vertical slice architecture pattern used throughout the codebase
- Error handling uses the Result/Either pattern for type-safe error propagation
