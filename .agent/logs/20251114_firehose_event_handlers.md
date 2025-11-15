# Firehose Event Handlers Implementation Guide

## Overview

This guide outlines how to enhance the firehose event processors to handle AT Protocol events by creating, updating, and deleting domain aggregates while maintaining clean separation between domain models and AT Protocol record types.

## Architecture Approach

Instead of adding AT Protocol dependencies to domain models, we'll:

1. **Use existing factory methods** - Leverage `CardFactory` and `Collection.create()`
2. **Create mapper services** - Convert AT Protocol records to domain input DTOs
3. **Enhance use cases** - Handle full aggregate lifecycle in event processors
4. **Maintain domain purity** - Keep domain models free of AT Protocol dependencies

## Implementation Steps

### Step 1: Create AT Protocol Record Mappers

Create mapper services that convert AT Protocol records to domain input objects:

```typescript
// src/modules/atproto/infrastructure/mappers/ATProtoRecordToDomainMapper.ts
export class ATProtoRecordToDomainMapper {
  static cardRecordToCardInput(record: CardRecord, atUri: string): ICardInput {
    // Convert AT Protocol card record to CardFactory input
  }

  static collectionRecordToCollectionProps(
    record: CollectionRecord,
    atUri: string,
  ): CollectionCreateProps {
    // Convert AT Protocol collection record to Collection.create() input
  }
}
```

### Step 2: Enhance Event Processors

Update the firehose event processors to:

#### For Card Events:

- **Create**: Parse record → Create via CardFactory → Mark as published → Save → Publish events
- **Update**: Find existing → Parse record → Update content → Update published ID → Save → Publish events
- **Delete**: Resolve ID → Delete from repo

#### For Collection Events:

- **Create**: Parse record → Create via Collection.create() → Mark as published → Save → Publish events
- **Update**: Find existing → Parse record → Update details → Update published ID → Save → Publish events
- **Delete**: Resolve ID → Delete from repo

### Step 3: Add Domain Methods

Add these methods to support external updates:

#### Card Domain:

```typescript
// In Card.ts
public updateContentFromText(text: string): Result<void, CardValidationError> {
  // For NOTE cards - update text content
}

public updatePublishedRecordId(publishedRecordId: PublishedRecordId): void {
  // Update the published record ID from firehose events
}
```

#### Collection Domain:

```typescript
// In Collection.ts
public updateDetailsFromExternal(name: string, description?: string): Result<void, CollectionValidationError> {
  // Update collection details from external source
}

public updatePublishedRecordId(publishedRecordId: PublishedRecordId): void {
  // Update the published record ID from firehose events
}
```

### Step 4: Enhance AT URI Resolution Service

Extend `IAtUriResolutionService` to support bidirectional mapping:

```typescript
// Add methods to store AT URI → Domain ID mappings
storeCardMapping(atUri: string, cardId: CardId): Promise<Result<void>>;
storeCollectionMapping(atUri: string, collectionId: CollectionId): Promise<Result<void>>;
```

### Step 5: Event Publishing Pattern

Each processor should follow this pattern:

```typescript
// 1. Process the record
const aggregate = // ... create or update aggregate
  // 2. Save to repository
  await this.repository.save(aggregate);

// 3. Publish domain events
const events = aggregate.domainEvents;
const publishResult = await this.eventPublisher.publishEvents(events);
aggregate.clearEvents(); // Clear after publishing
```

### Step 6: Error Handling Strategy

- **Parsing errors**: Log and skip (don't fail the firehose)
- **Domain validation errors**: Log and skip
- **Repository errors**: Log and potentially retry
- **Event publishing errors**: Log but don't fail the operation

### Step 7: Testing Strategy

Create integration tests that:

- Mock firehose events with real AT Protocol record structures
- Verify aggregates are created/updated correctly
- Verify domain events are published
- Test error scenarios

## Key Benefits

1. **Domain Purity**: Domain models remain free of AT Protocol dependencies
2. **Reusability**: Existing factory methods and validation logic are reused
3. **Consistency**: Same creation/update paths as internal operations
4. **Event Driven**: Proper domain events are published for downstream processing
5. **Testability**: Easy to test with mock AT Protocol records

## Files to Modify

1. `ProcessCardFirehoseEventUseCase.ts` - Enhanced card event handling
2. `ProcessCollectionFirehoseEventUseCase.ts` - Enhanced collection event handling
3. `ProcessCollectionLinkFirehoseEventUseCase.ts` - Enhanced collection link handling
4. `Card.ts` - Add update methods for external sources
5. `Collection.ts` - Add update methods for external sources
6. `IAtUriResolutionService.ts` - Add mapping storage methods

## New Files to Create

1. `ATProtoRecordToDomainMapper.ts` - Record to domain input conversion
2. Integration tests for each event processor

This approach maintains clean architecture while enabling full firehose event processing capabilities.
