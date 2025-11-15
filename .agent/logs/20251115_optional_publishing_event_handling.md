# Optional Publishing Event Handling Options

## Problem Statement

The `UpdateUrlCardAssociationsUseCase` is complex and handles multiple operations (note creation/updates, collection additions/removals). When processing firehose events, we need to skip publishing since the events represent already-published records, but the current use case doesn't have a clean way to handle this.

## Option 1: Add Optional Publishing Parameters to UpdateUrlCardAssociationsUseCase

**Approach**: Extend the DTO with optional published record IDs for different operations.

**Pros**:

- Single interface, maintains existing API
- Minimal code changes
- Handles all scenarios in one place

**Cons**:

- Makes the DTO more complex
- Mixed concerns (normal operations vs firehose events)
- Hard to understand which parameters apply to which operations

**Implementation**:

```typescript
export interface UpdateUrlCardAssociationsDTO {
  cardId: string;
  curatorId: string;
  note?: string;
  addToCollections?: string[];
  removeFromCollections?: string[];
  // New optional parameters for firehose events
  noteCardPublishedRecordId?: PublishedRecordId;
  collectionLinkPublishedRecordIds?: Map<string, PublishedRecordId>; // collectionId -> publishedRecordId
  skipPublishing?: boolean;
}
```

## Option 2: Create Separate Firehose-Specific Use Cases

**Approach**: Create dedicated use cases for firehose event processing that handle the publishing logic differently.

**Pros**:

- Clear separation of concerns
- Easier to understand and maintain
- Can optimize for firehose-specific requirements
- No impact on existing use cases

**Cons**:

- Code duplication
- More files to maintain
- Need to keep business logic in sync

**Implementation**:

```typescript
// New use case specifically for firehose events
export class ProcessNoteCardFirehoseEventUseCase {
  async execute(
    request: ProcessNoteCardFirehoseEventDTO,
  ): Promise<Result<void>> {
    // Handle note card creation/update with pre-existing published record ID
    // Skip all publishing operations
    // Reuse domain services but with different flow
  }
}

export class ProcessCollectionLinkFirehoseEventUseCase {
  async execute(
    request: ProcessCollectionLinkFirehoseEventDTO,
  ): Promise<Result<void>> {
    // Handle collection link operations with pre-existing published record ID
    // Skip publishing operations
  }
}
```

## Option 3: Context-Based Publishing Control

**Approach**: Add a context parameter that controls publishing behavior throughout the operation chain.

**Pros**:

- Clean separation of concerns
- Reuses existing logic
- Easy to extend for other contexts
- Minimal API changes

**Cons**:

- Requires threading context through multiple layers
- Could be forgotten in new code paths

**Implementation**:

```typescript
export enum OperationContext {
  USER_INITIATED = 'user_initiated',
  FIREHOSE_EVENT = 'firehose_event',
  SYSTEM_MIGRATION = 'system_migration',
}

export interface UpdateUrlCardAssociationsDTO {
  cardId: string;
  curatorId: string;
  note?: string;
  addToCollections?: string[];
  removeFromCollections?: string[];
  // New context parameter
  context?: OperationContext;
  publishedRecordIds?: {
    noteCard?: PublishedRecordId;
    collectionLinks?: Map<string, PublishedRecordId>;
  };
}
```

## Option 4: Service-Level Publishing Control

**Approach**: Modify domain services to accept publishing control parameters.

**Pros**:

- Centralized publishing control
- Reuses existing use case logic
- Clean separation at service level

**Cons**:

- Changes to multiple service interfaces
- Could make services more complex

**Implementation**:

```typescript
// Modify CardLibraryService
async addCardToLibrary(
  card: Card,
  curatorId: CuratorId,
  options?: {
    skipPublishing?: boolean;
    publishedRecordId?: PublishedRecordId;
  }
): Promise<Result<Card, ...>>

// Modify CardCollectionService
async addCardToCollections(
  card: Card,
  collectionIds: CollectionId[],
  curatorId: CuratorId,
  options?: {
    skipPublishing?: boolean;
    publishedRecordIds?: Map<string, PublishedRecordId>;
  }
): Promise<Result<Collection[], ...>>
```

## Option 5: Factory Pattern for Use Case Creation

**Approach**: Create different variants of the use case based on the execution context.

**Pros**:

- Clean separation without code duplication
- Easy to test different behaviors
- Flexible for future contexts

**Cons**:

- More complex setup
- Factory pattern overhead

**Implementation**:

```typescript
export class UpdateUrlCardAssociationsUseCaseFactory {
  static createForUserOperation(
    dependencies,
  ): UpdateUrlCardAssociationsUseCase {
    return new UpdateUrlCardAssociationsUseCase(dependencies, {
      publishingEnabled: true,
    });
  }

  static createForFirehoseEvent(
    dependencies,
  ): UpdateUrlCardAssociationsUseCase {
    return new UpdateUrlCardAssociationsUseCase(dependencies, {
      publishingEnabled: false,
    });
  }
}
```

## Recommended Approach: Option 3 (Context-Based Publishing Control)

**Rationale**:

- Provides clean separation without major architectural changes
- Reuses existing business logic
- Easy to understand and maintain
- Extensible for future contexts (migrations, bulk operations, etc.)
- Minimal impact on existing code

**Implementation Strategy**:

1. Add `OperationContext` enum and optional context parameter to DTOs
2. Thread context through service calls
3. Modify services to check context before publishing
4. Update firehose processors to pass `FIREHOSE_EVENT` context
5. Default to `USER_INITIATED` context for backward compatibility

This approach provides the best balance of maintainability, clarity, and minimal code changes while solving the core problem of optional publishing in firehose event processing.
