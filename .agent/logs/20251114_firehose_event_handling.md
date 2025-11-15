# Firehose Event Handling - Duplicate Detection Strategy

## Overview

This document outlines the strategy for handling AT Protocol firehose events and detecting duplicates using the existing `publishedRecords` table, without requiring a separate event processing log.

## Current Implementation

### Cards

- **Create**: `ATProtoCardPublisher.publishCardToLibrary()` creates/updates records, stores `PublishedRecordId` in card's library membership
- **Update**: Uses `putRecord()` with existing rkey when card already has a published record
- **Delete**: `unpublishCardFromLibrary()` deletes the AT Protocol record

### Collections

- **Create**: `ATProtoCollectionPublisher.publish()` creates/updates collection records
- **Update**: Uses `putRecord()` with existing rkey when collection has `publishedRecordId`
- **Delete**: `unpublish()` deletes the collection record

### Collection Links

- **Create**: `publishCardAddedToCollection()` creates link records
- **Delete**: `unpublishCardAddedToCollection()` deletes link records
- **No Update**: Collection links don't have update operations

### Storage Pattern

All use the `publishedRecords` table with:

```sql
id: uuid (primary key)
uri: text (AT URI)
cid: text (content hash)
recordedAt: timestamp
UNIQUE INDEX on (uri, cid)
```

## Duplicate Detection Strategy

### For CREATE Events

✅ **Works as designed**: Check if `(uri, cid)` exists in `publishedRecords` table

- If exists → already processed, skip
- If not exists → process the create

### For UPDATE Events

⚠️ **Needs verification**: Check if `(uri, cid)` exists in `publishedRecords` table

- **Key question**: When we update a collection/card, does the new CID get stored?
- Looking at the code: Yes, `putRecord()` operations should generate new CIDs, and these should be stored

### For DELETE Events

⚠️ **Needs implementation**: More complex logic required

1. Find all `publishedRecords` with matching `uri` (ignore CID)
2. Use `ATUri.create(uri)` to determine entity type from collection field
3. Query appropriate table to see if entity still exists
4. If not found → already deleted, skip
5. If found → process the delete

## Changes Needed

### 1. Verify UPDATE CID Storage

Need to confirm that when we call `putRecord()`, the new CID is captured and stored. Looking at the publishers:

```typescript
// In ATProtoCollectionPublisher.publish()
const createResult = await agent.com.atproto.repo.putRecord({
  repo: curatorDid.value,
  collection: this.collectionCollection,
  rkey: rkey,
  record: collectionRecordDTO,
});
// ❓ Does putRecord return a new CID? Need to capture and store it
```

**Required change**: Ensure `putRecord()` responses update the `publishedRecords` table with new CID.

### 2. Enhance AT URI Resolution for DELETE Detection

Expand `IAtUriResolutionService` to handle all entity types:

```typescript
interface IAtUriResolutionService {
  resolveAtUri(atUri: string): Promise<Result<AtUriResolutionResult | null>>;
  resolveCardId(atUri: string): Promise<Result<CardId | null>>;
  resolveCollectionId(atUri: string): Promise<Result<CollectionId | null>>;
  // Add collection link resolution
  resolveCollectionLinkId(
    atUri: string,
  ): Promise<Result<{ collectionId: CollectionId; cardId: CardId } | null>>;
}

enum AtUriResourceType {
  CARD = 'card',
  COLLECTION = 'collection',
  COLLECTION_LINK = 'collection_link',
}
```

### 3. Add Collection Type Detection

Enhance `ATUri` or create a helper to determine entity type from collection field:

```typescript
// In ATUri class or as utility
public getEntityType(configService: EnvironmentConfigService): AtUriResourceType {
  const collections = configService.getAtProtoCollections();
  if (this.collection === collections.card) return AtUriResourceType.CARD;
  if (this.collection === collections.collection) return AtUriResourceType.COLLECTION;
  if (this.collection === collections.collectionLink) return AtUriResourceType.COLLECTION_LINK;
  throw new Error(`Unknown collection type: ${this.collection}`);
}
```

### 4. Implement DELETE Detection Service

```typescript
interface IDeleteDetectionService {
  hasBeenDeleted(atUri: string): Promise<Result<boolean>>;
}

class DeleteDetectionService implements IDeleteDetectionService {
  async hasBeenDeleted(atUri: string): Promise<Result<boolean>> {
    // 1. Find all publishedRecords with matching URI
    const records = await this.findPublishedRecordsByUri(atUri);
    if (records.length === 0) return ok(true); // No records = was deleted

    // 2. Determine entity type from AT URI
    const atUriResult = ATUri.create(atUri);
    if (atUriResult.isErr()) return err(atUriResult.error);

    const entityType = atUriResult.value.getEntityType(this.configService);

    // 3. Check if entity still exists
    switch (entityType) {
      case AtUriResourceType.COLLECTION:
        const collectionId =
          await this.atUriResolver.resolveCollectionId(atUri);
        return ok(collectionId === null);
      case AtUriResourceType.CARD:
        const cardId = await this.atUriResolver.resolveCardId(atUri);
        return ok(cardId === null);
      case AtUriResourceType.COLLECTION_LINK:
        const linkInfo =
          await this.atUriResolver.resolveCollectionLinkId(atUri);
        return ok(linkInfo === null);
    }
  }
}
```

### 5. Clean Up Published Records on DELETE

Modify delete operations to remove `publishedRecords` entries:

```typescript
// In delete use cases and services
async deleteCollection(collectionId: CollectionId) {
  const collection = await this.repository.findById(collectionId);

  // Delete the collection
  await this.repository.delete(collectionId);

  // Clean up published records
  if (collection.publishedRecordId) {
    await this.cleanupPublishedRecord(collection.publishedRecordId);
  }

  // Clean up collection link published records
  for (const link of collection.cardLinks) {
    if (link.publishedRecordId) {
      await this.cleanupPublishedRecord(link.publishedRecordId);
    }
  }
}
```

## Implementation Priority

1. **High Priority**: Verify and fix UPDATE CID storage
2. **High Priority**: Implement card and collection link AT URI resolution
3. **Medium Priority**: Add DELETE detection service
4. **Low Priority**: Clean up published records on delete (nice to have, but detection works without it)

## Potential Edge Cases

1. **Race conditions**: Multiple events for same URI arriving simultaneously
2. **Partial failures**: Entity created but published record not stored
3. **CID mismatches**: AT Protocol CID differs from stored CID due to timing

## Benefits of This Approach

- **Simple**: Leverages existing `publishedRecords` table
- **Efficient**: Single table lookup for CREATE/UPDATE detection
- **No additional storage**: No event log table required
- **Reliable**: Uses AT Protocol's own CID mechanism for change detection

## Next Steps

1. Audit UPDATE operations to ensure new CIDs are stored
2. Expand `IAtUriResolutionService` for all entity types
3. Implement DELETE detection logic
4. Add collection type detection to `ATUri`
5. Test with real firehose events
