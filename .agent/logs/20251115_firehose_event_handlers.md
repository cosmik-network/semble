# Firehose Event Handlers Implementation Guide - Reusing Existing Use Cases

## Overview

This implementation reuses existing use cases as much as possible for handling firehose events. The key insight is that firehose events represent already-published records, so we need to skip the publishing step and use the provided AT URI + CID as the published record ID.

## Architecture Approach

1. **Reuse existing use cases** - Leverage existing business logic in use cases
2. **Skip publishing for firehose events** - Add optional `publishedRecordId` parameter to use cases
3. **Use AT URI resolution** - Convert AT URIs from firehose events to domain entities
4. **Minimal changes** - Keep modifications as simple as possible

## Implementation Strategy

### Core Pattern

Each firehose processor will:

1. Parse the AT URI and extract relevant data from the record
2. Use `IAtUriResolutionService` to resolve AT URIs to domain entities
3. Call existing use cases with an optional `publishedRecordId` parameter
4. When `publishedRecordId` is provided, skip publishing and use that ID for marking as published

### Use Case Modifications

Add optional `publishedRecordId?: PublishedRecordId` parameter to these use cases:

- `AddUrlToLibraryUseCase`
- `CreateCollectionUseCase`
- `UpdateCollectionUseCase`
- `DeleteCollectionUseCase`
- `RemoveCardFromLibraryUseCase`

For `UpdateUrlCardAssociationsUseCase`, we'll need a more complex approach since it handles multiple operations. We'll add optional parameters for collection link published record IDs.

## Event Handling Implementation

### URL Card Events

#### Create

- Extract URL and curator DID from record
- Call `AddUrlToLibraryUseCase` with `publishedRecordId` from event

#### Update

- Skip for now (URL cards don't typically update)

#### Delete

- Resolve AT URI to card ID
- Call `RemoveCardFromLibraryUseCase` with `publishedRecordId` to skip unpublishing

### Note Card Events

#### Create/Update

- Extract parent card AT URI, note text, and curator DID
- Resolve parent card AT URI to card ID
- Call `UpdateUrlCardAssociationsUseCase` with note and `publishedRecordId`

#### Delete

- Resolve AT URI to card ID
- Verify it's a note card
- Call `RemoveCardFromLibraryUseCase` with `publishedRecordId`

### Collection Events

#### Create

- Extract name, description, curator DID from record
- Call `CreateCollectionUseCase` with `publishedRecordId` from event

#### Update

- Resolve AT URI to collection ID
- Extract updated fields from record
- Call `UpdateCollectionUseCase` with `publishedRecordId`

#### Delete

- Resolve AT URI to collection ID
- Call `DeleteCollectionUseCase` with `publishedRecordId` to skip unpublishing

### Collection Link Events

#### Create

- Extract collection and card strong refs from record
- Resolve AT URIs to collection ID and card ID
- Call `UpdateUrlCardAssociationsUseCase` with `addToCollections` and link `publishedRecordId`

#### Delete

- Extract collection and card strong refs from record
- Resolve AT URIs to collection ID and card ID
- Call `UpdateUrlCardAssociationsUseCase` with `removeFromCollections` and link `publishedRecordId`

## Key Benefits

1. **Reuses existing business logic** - No duplication of validation and domain rules
2. **Minimal code changes** - Just add optional parameters to existing use cases
3. **Consistent behavior** - Same validation and error handling as normal operations
4. **Simple to test** - Can test firehose handling by calling existing use cases with mock data

## Files to Modify

### Use Cases (add optional publishedRecordId parameter):

- `AddUrlToLibraryUseCase.ts`
- `CreateCollectionUseCase.ts`
- `UpdateCollectionUseCase.ts`
- `DeleteCollectionUseCase.ts`
- `RemoveCardFromLibraryUseCase.ts`
- `UpdateUrlCardAssociationsUseCase.ts` (more complex - add collection link published record IDs)

### Firehose Processors (simplify to call existing use cases):

- `ProcessCardFirehoseEventUseCase.ts`
- `ProcessCollectionFirehoseEventUseCase.ts`
- `ProcessCollectionLinkFirehoseEventUseCase.ts`

### Services (add mapping storage methods):

- `IAtUriResolutionService.ts` (already has the methods we need)

This approach maintains clean separation of concerns while maximizing code reuse and minimizing the complexity of firehose event handling.
