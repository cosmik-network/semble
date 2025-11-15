# Published Record Cleanup Implementation

## Overview

This document summarizes the approach implemented for cleaning up published record IDs when cards, collections, and library memberships are deleted from the system.

## Problem Statement

When items are deleted from the system, their associated published records in the AT Protocol network may have multiple versions (different CIDs for the same URI). We need to ensure all versions of these published records are cleaned up from our local database to prevent orphaned records.

## Solution Approach

### Core Strategy

1. **Delete by URI, not CID**: When cleaning up published records, delete all records matching the URI rather than just the specific CID. This ensures all versions of a record are removed.

2. **Extract before delete**: Before deleting domain objects, extract their published record information to enable cleanup.

3. **Consistent cleanup pattern**: Apply the same cleanup pattern across all deletion scenarios.

### Implementation Details

#### 1. Repository-Level Cleanup Methods

Added `deletePublishedRecordsByUri(uri: string)` methods to both:

- `DrizzleCardRepository`
- `DrizzleCollectionRepository`

These methods delete all published records matching a given URI:

```typescript
async deletePublishedRecordsByUri(uri: string): Promise<Result<void>> {
  try {
    await this.db.delete(publishedRecords).where(eq(publishedRecords.uri, uri));
    return ok(undefined);
  } catch (error) {
    return err(error as Error);
  }
}
```

#### 2. Card Deletion Cleanup

**In `DrizzleCardRepository.delete()`:**

- Get the card before deletion to extract `publishedRecordId`
- If card has a published record, clean up all records with that URI
- Then delete the card (cascades handle library memberships)

#### 3. Collection Deletion Cleanup

**In `DrizzleCollectionRepository.delete()`:**

- Get the collection before deletion
- Clean up collection's own published record URI
- Clean up all card link published record URIs
- Then delete the collection (cascades handle collaborators and card links)

#### 4. Library Membership Removal Cleanup

**In `CardLibraryService.removeCardFromLibrary()`:**

- Get library membership's `publishedRecordId`
- Unpublish from AT Protocol
- Clean up all published records with that URI
- Remove the library membership

#### 5. Collection Link Removal Cleanup

**In `CardCollectionService.removeCardFromCollection()`:**

- Get card link's `publishedRecordId`
- Unpublish the collection link from AT Protocol
- Clean up all published records with that URI
- Remove the card from collection

## Cleanup Scenarios

### 1. Removing Card from Library

```
Card in Library → Get publishedRecordId → Unpublish → Clean up URI → Remove membership
```

### 2. Removing Card from Collection

```
Card in Collection → Get link publishedRecordId → Unpublish → Clean up URI → Remove link
```

### 3. Deleting Collection

```
Collection → Get collection publishedRecordId + all link publishedRecordIds →
Unpublish all → Clean up all URIs → Delete collection
```

### 4. Deleting Card

```
Card → Get card publishedRecordId → Clean up URI → Delete card
```

## Benefits

1. **Complete cleanup**: Removes all versions of published records (different CIDs, same URI)
2. **Consistent pattern**: Same approach across all deletion scenarios
3. **Safe**: Only deletes when we have actual published record information
4. **Efficient**: Single query per URI to clean up all versions

## Error Handling

- If AT Protocol unpublish fails, we still clean up database records
- Cleanup failures are propagated as validation errors
- Authentication errors are properly propagated up the chain

## Database Schema

The `published_records` table supports this approach with:

- `uri` field for AT Protocol URIs
- `cid` field for content identifiers
- Unique constraint on `(uri, cid)` pairs
- Index on `uri` for efficient cleanup queries

## Testing

Integration tests verify:

- Published records are properly cleaned up on deletion
- Multiple versions of the same URI are all removed
- Cascading deletions work correctly
- Error scenarios are handled appropriately
