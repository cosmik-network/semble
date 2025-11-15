# Firehose Event Handling - Layered Architecture Design

## Overview

This document outlines the layered architecture design for handling AT Protocol firehose events within our existing DDD structure. The system will process CREATE, UPDATE, and DELETE events for cards, collections, and collection links while implementing the duplicate detection strategy outlined in the previous document.

## Event Flow Architecture

The firehose worker operates as a **standalone event producer** that bridges external AT Protocol events to internal domain events, avoiding unnecessary BullMQ abstractions for firehose input while still publishing domain events to the internal event system.

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AT Protocol   │───▶│ Firehose Worker  │───▶│ Internal Events │
│    Firehose     │    │    (Direct WS)   │    │ (BullMQ/Memory) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Domain Entities │
                       │ (Cards/Collections)
                       └─────────────────┘
```

## Full Event Lifecycle Diagram

```
AT Protocol Network
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Firehose Worker Process                      │
│  ┌─────────────────┐    ┌──────────────────────────────────────┐│
│  │ @atproto/sync   │───▶│        FirehoseEventHandler          ││
│  │   Firehose      │    │                                      ││
│  │  (WebSocket)    │    │  ┌─────────────────────────────────┐ ││
│  └─────────────────┘    │  │ ProcessFirehoseEventUseCase     │ ││
│                         │  │                                 │ ││
│                         │  │ 1. Check Duplicates             │ ││
│                         │  │ 2. Route by Collection Type     │ ││
│                         │  │ 3. Process Entity Changes       │ ││
│                         │  │ 4. Publish Domain Events        │ ││
│                         │  └─────────────────────────────────┘ ││
│                         └──────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Domain Layer Updates                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    Cards    │  │ Collections │  │   Collection Links      │  │
│  │ Repository  │  │ Repository  │  │     (via Collections)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Internal Event Publishing                      │
│                                                                 │
│  ┌─────────────────┐              ┌─────────────────────────┐   │
│  │ BullMQ Events   │     OR       │   In-Memory Events      │   │
│  │ (Production)    │              │   (Development)         │   │
│  └─────────────────┘              └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│              Downstream Event Processing                       │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │Feed Worker  │  │Search Worker│  │    Analytics Worker     │  │
│  │(BullMQ)     │  │(BullMQ)     │  │       (Future)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture Layers

### Domain Layer

#### New Domain Concepts

**AtUriResourceType Enum**

```typescript
export enum AtUriResourceType {
  CARD = 'card',
  COLLECTION = 'collection',
  COLLECTION_LINK = 'collection_link',
}
```

**Enhanced ATUri Domain Object**

```typescript
export class ATUri extends ValueObject<ATUriProps> {
  // ... existing methods ...

  public getEntityType(
    configService: EnvironmentConfigService,
  ): AtUriResourceType {
    const collections = configService.getAtProtoCollections();
    if (this.collection === collections.card) return AtUriResourceType.CARD;
    if (this.collection === collections.collection)
      return AtUriResourceType.COLLECTION;
    if (this.collection === collections.collectionLink)
      return AtUriResourceType.COLLECTION_LINK;
    throw new Error(`Unknown collection type: ${this.collection}`);
  }
}
```

#### Enhanced Domain Services

**Expanded IAtUriResolutionService**

```typescript
export interface IAtUriResolutionService {
  resolveAtUri(atUri: string): Promise<Result<AtUriResolutionResult | null>>;
  resolveCardId(atUri: string): Promise<Result<CardId | null>>;
  resolveCollectionId(atUri: string): Promise<Result<CollectionId | null>>;
  resolveCollectionLinkId(
    atUri: string,
  ): Promise<Result<{ collectionId: CollectionId; cardId: CardId } | null>>;
}
```

**New IFirehoseEventDuplicationService**

```typescript
export interface IFirehoseEventDuplicationService {
  hasEventBeenProcessed(
    atUri: string,
    cid: string | null,
    operation: FirehoseEventType,
  ): Promise<Result<boolean>>;

  hasBeenDeleted(atUri: string): Promise<Result<boolean>>;
}
```

### Application Layer

#### New Domain Events

**FirehoseEventProcessed**

```typescript
export class FirehoseEventProcessed extends DomainEvent {
  constructor(
    public readonly atUri: string,
    public readonly cid: string | null,
    public readonly eventType: FirehoseEventType,
    public readonly entityType: AtUriResourceType,
    public readonly entityId?: string,
  ) {
    super();
  }
}
```

#### New Use Cases

**ProcessFirehoseEventUseCase**

```typescript
export interface ProcessFirehoseEventDTO {
  atUri: string;
  cid: string | null;
  eventType: 'create' | 'update' | 'delete';
  record?: any; // The AT Protocol record data
}

export class ProcessFirehoseEventUseCase {
  constructor(
    private duplicationService: IFirehoseEventDuplicationService,
    private atUriResolutionService: IAtUriResolutionService,
    private cardRepository: ICardRepository,
    private collectionRepository: ICollectionRepository,
    private eventPublisher: IEventPublisher,
    private configService: EnvironmentConfigService,
  ) {}

  async execute(request: ProcessFirehoseEventDTO): Promise<Result<void>> {
    // 1. Check for duplicates
    // 2. Route to appropriate handler based on collection type
    // 3. Process the event
    // 4. Publish domain events
  }
}
```

**ProcessCardFirehoseEventUseCase**

```typescript
export class ProcessCardFirehoseEventUseCase {
  async execute(request: {
    atUri: string;
    cid: string | null;
    eventType: 'create' | 'update' | 'delete';
    record?: any;
  }): Promise<Result<void>> {
    // Handle card-specific firehose events
  }
}
```

**ProcessCollectionFirehoseEventUseCase**

```typescript
export class ProcessCollectionFirehoseEventUseCase {
  async execute(request: {
    atUri: string;
    cid: string | null;
    eventType: 'create' | 'update' | 'delete';
    record?: any;
  }): Promise<Result<void>> {
    // Handle collection-specific firehose events
  }
}
```

**ProcessCollectionLinkFirehoseEventUseCase**

```typescript
export class ProcessCollectionLinkFirehoseEventUseCase {
  async execute(request: {
    atUri: string;
    cid: string | null;
    eventType: 'create' | 'update' | 'delete';
    record?: any;
  }): Promise<Result<void>> {
    // Handle collection link-specific firehose events
  }
}
```

#### Event Handlers

**FirehoseEventHandler**

```typescript
export class FirehoseEventHandler {
  constructor(
    private processFirehoseEventUseCase: ProcessFirehoseEventUseCase,
  ) {}

  async handle(event: AtProtoFirehoseEvent): Promise<Result<void>> {
    return this.processFirehoseEventUseCase.execute({
      atUri: event.uri,
      cid: event.cid,
      eventType: event.eventType,
      record: event.record,
    });
  }
}
```

#### New Application Services

**IFirehoseService**

```typescript
export interface IFirehoseService {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}
```

### Infrastructure Layer

#### AT Protocol Firehose Integration

**AtProtoFirehoseService**

```typescript
export class AtProtoFirehoseService implements IFirehoseService {
  constructor(
    private firehoseEventHandler: FirehoseEventHandler,
    private configService: EnvironmentConfigService,
    private idResolver: IdResolver,
  ) {}

  async start(): Promise<void> {
    const runner = new MemoryRunner({});

    this.firehose = new Firehose({
      service: 'wss://bsky.network',
      runner,
      idResolver: this.idResolver,
      filterCollections: this.getFilteredCollections(),
      handleEvent: this.handleFirehoseEvent.bind(this),
      onError: this.handleError.bind(this),
    });

    await this.firehose.start();
  }

  private async handleFirehoseEvent(evt: Event): Promise<void> {
    const result = await this.firehoseEventHandler.handle({
      uri: evt.uri,
      cid: evt.cid,
      eventType: evt.event as 'create' | 'update' | 'delete',
      record: evt.record,
      did: evt.did,
      collection: evt.collection,
    });

    if (result.isErr()) {
      console.error('Failed to process firehose event:', result.error);
    }
  }

  private getFilteredCollections(): string[] {
    const collections = this.configService.getAtProtoCollections();
    return [
      collections.card,
      collections.collection,
      collections.collectionLink,
    ];
  }
}
```

**DrizzleFirehoseEventDuplicationService**

```typescript
export class DrizzleFirehoseEventDuplicationService
  implements IFirehoseEventDuplicationService
{
  constructor(
    private db: PostgresJsDatabase,
    private atUriResolver: IAtUriResolutionService,
    private configService: EnvironmentConfigService,
  ) {}

  async hasEventBeenProcessed(
    atUri: string,
    cid: string | null,
    operation: FirehoseEventType,
  ): Promise<Result<boolean>> {
    try {
      // For CREATE/UPDATE: check if (uri, cid) exists
      if (operation === 'create' || operation === 'update') {
        if (!cid) return ok(false);

        const result = await this.db
          .select({ id: publishedRecords.id })
          .from(publishedRecords)
          .where(
            and(eq(publishedRecords.uri, atUri), eq(publishedRecords.cid, cid)),
          )
          .limit(1);

        return ok(result.length > 0);
      }

      // For DELETE: use more complex logic
      return this.hasBeenDeleted(atUri);
    } catch (error) {
      return err(error as Error);
    }
  }

  async hasBeenDeleted(atUri: string): Promise<Result<boolean>> {
    try {
      // 1. Find all publishedRecords with matching URI
      const records = await this.db
        .select()
        .from(publishedRecords)
        .where(eq(publishedRecords.uri, atUri));

      if (records.length === 0) {
        return ok(true); // No records = was deleted
      }

      // 2. Determine entity type from AT URI
      const atUriResult = ATUri.create(atUri);
      if (atUriResult.isErr()) {
        return err(atUriResult.error);
      }

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
        default:
          return err(new Error(`Unknown entity type: ${entityType}`));
      }
    } catch (error) {
      return err(error as Error);
    }
  }
}
```

**Enhanced DrizzleAtUriResolutionService**

```typescript
export class DrizzleAtUriResolutionService implements IAtUriResolutionService {
  // ... existing methods ...

  async resolveCardId(atUri: string): Promise<Result<CardId | null>> {
    try {
      const cardResult = await this.db
        .select({ id: cards.id })
        .from(cards)
        .innerJoin(
          publishedRecords,
          eq(cards.publishedRecordId, publishedRecords.id),
        )
        .where(eq(publishedRecords.uri, atUri))
        .limit(1);

      if (cardResult.length === 0) {
        return ok(null);
      }

      const cardIdResult = CardId.createFromString(cardResult[0]!.id);
      if (cardIdResult.isErr()) {
        return err(cardIdResult.error);
      }

      return ok(cardIdResult.value);
    } catch (error) {
      return err(error as Error);
    }
  }

  async resolveCollectionLinkId(
    atUri: string,
  ): Promise<Result<{ collectionId: CollectionId; cardId: CardId } | null>> {
    try {
      const linkResult = await this.db
        .select({
          collectionId: collectionCards.collectionId,
          cardId: collectionCards.cardId,
        })
        .from(collectionCards)
        .innerJoin(
          publishedRecords,
          eq(collectionCards.publishedRecordId, publishedRecords.id),
        )
        .where(eq(publishedRecords.uri, atUri))
        .limit(1);

      if (linkResult.length === 0) {
        return ok(null);
      }

      const collectionIdResult = CollectionId.createFromString(
        linkResult[0]!.collectionId,
      );
      const cardIdResult = CardId.createFromString(linkResult[0]!.cardId);

      if (collectionIdResult.isErr()) {
        return err(collectionIdResult.error);
      }
      if (cardIdResult.isErr()) {
        return err(cardIdResult.error);
      }

      return ok({
        collectionId: collectionIdResult.value,
        cardId: cardIdResult.value,
      });
    } catch (error) {
      return err(error as Error);
    }
  }
}
```

#### Standalone Worker Process

**FirehoseWorkerProcess** (implements IProcess directly, not BaseWorkerProcess)

```typescript
export class FirehoseWorkerProcess implements IProcess {
  private firehose?: Firehose;
  private runner?: MemoryRunner;

  constructor(
    private configService: EnvironmentConfigService,
    private firehoseEventHandler: FirehoseEventHandler,
  ) {}

  async start(): Promise<void> {
    console.log('Starting firehose worker...');

    const runner = new MemoryRunner({});
    this.runner = runner;

    this.firehose = new Firehose({
      service: 'wss://bsky.network',
      runner,
      idResolver: new IdResolver(),
      filterCollections: this.getFilteredCollections(),
      handleEvent: this.handleFirehoseEvent.bind(this),
      onError: this.handleError.bind(this),
    });

    await this.firehose.start();
    console.log('Firehose worker started');

    this.setupShutdownHandlers();
  }

  private async handleFirehoseEvent(evt: Event): Promise<void> {
    const result = await this.firehoseEventHandler.handle({
      uri: evt.uri,
      cid: evt.cid,
      eventType: evt.event as 'create' | 'update' | 'delete',
      record: evt.record,
      did: evt.did,
      collection: evt.collection,
    });

    if (result.isErr()) {
      console.error('Failed to process firehose event:', result.error);
    }
  }

  private handleError(err: Error): void {
    console.error('Firehose error:', err);
  }

  private getFilteredCollections(): string[] {
    const collections = this.configService.getAtProtoCollections();
    return [
      collections.card,
      collections.collection,
      collections.collectionLink,
    ];
  }

  private setupShutdownHandlers(): void {
    const shutdown = async () => {
      console.log('Shutting down firehose worker...');
      if (this.firehose) {
        await this.firehose.destroy();
      }
      if (this.runner) {
        await this.runner.destroy();
      }
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}
```

## Detailed Event Processing Flow

### 1. Firehose Event Reception

```
AT Protocol Network
        │ WebSocket Stream
        ▼
@atproto/sync Firehose
        │ Filtered by collection types
        ▼
FirehoseEventHandler.handle()
```

### 2. Duplicate Detection & Routing

```
ProcessFirehoseEventUseCase.execute()
        │
        ├─ CREATE/UPDATE: Check (uri, cid) in publishedRecords
        ├─ DELETE: Check entity existence via AT URI resolution
        │
        └─ Route by collection type:
           ├─ network.cosmik.card → ProcessCardFirehoseEventUseCase
           ├─ network.cosmik.collection → ProcessCollectionFirehoseEventUseCase
           └─ network.cosmik.collectionLink → ProcessCollectionLinkFirehoseEventUseCase
```

### 3. Entity Processing

```
Specific Use Cases
        │
        ├─ Validate AT Protocol record structure
        ├─ Map to domain entities
        ├─ Apply business rules
        ├─ Persist changes via repositories
        │
        └─ Raise domain events:
           ├─ CardAddedToLibraryEvent
           ├─ CardAddedToCollectionEvent
           ├─ CollectionCreatedEvent
           └─ etc.
```

### 4. Internal Event Publishing

```
Domain Events
        │
        ├─ BullMQ (Production/Development with Redis)
        │   ├─ feeds queue → Feed Worker
        │   ├─ search queue → Search Worker
        │   └─ analytics queue → Analytics Worker (future)
        │
        └─ In-Memory (Local Development)
            └─ InMemoryEventWorkerProcess
```

## Process Wiring & Deployment

### Worker Entry Point

**src/workers/firehose-worker.ts**

```typescript
import { configService } from '../shared/infrastructure/config';
import { RepositoryFactory } from '../shared/infrastructure/http/factories/RepositoryFactory';
import { ServiceFactory } from '../shared/infrastructure/http/factories/ServiceFactory';
import { FirehoseWorkerProcess } from '../modules/atproto/infrastructure/processes/FirehoseWorkerProcess';
import { FirehoseEventHandler } from '../modules/atproto/application/handlers/FirehoseEventHandler';
import { ProcessFirehoseEventUseCase } from '../modules/atproto/application/useCases/ProcessFirehoseEventUseCase';
import { DrizzleFirehoseEventDuplicationService } from '../modules/atproto/infrastructure/services/DrizzleFirehoseEventDuplicationService';

async function main() {
  console.log('Starting firehose worker...');

  const repositories = RepositoryFactory.create(configService);
  const services = ServiceFactory.createForWorker(configService, repositories);

  // Create firehose-specific services
  const duplicationService = new DrizzleFirehoseEventDuplicationService(
    repositories.database,
    repositories.atUriResolutionService,
    configService,
  );

  const processFirehoseEventUseCase = new ProcessFirehoseEventUseCase(
    duplicationService,
    repositories.atUriResolutionService,
    repositories.cardRepository,
    repositories.collectionRepository,
    services.eventPublisher, // Publishes internal domain events
    configService,
  );

  const firehoseEventHandler = new FirehoseEventHandler(
    processFirehoseEventUseCase,
  );

  const firehoseWorker = new FirehoseWorkerProcess(
    configService,
    firehoseEventHandler,
  );

  await firehoseWorker.start();
}

main().catch((error) => {
  console.error('Failed to start firehose worker:', error);
  process.exit(1);
});
```

### Build Configuration

**package.json scripts**

```json
{
  "scripts": {
    "worker:firehose": "node dist/workers/firehose-worker.js"
  }
}
```

**tsup.config.ts**

```typescript
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'workers/feed-worker': 'src/workers/feed-worker.ts',
    'workers/search-worker': 'src/workers/search-worker.ts',
    'workers/firehose-worker': 'src/workers/firehose-worker.ts', // Add this
  },
  // ... rest of config
});
```

### Fly.io Process Configuration

**fly.development.toml**

```toml
[processes]
  web = "npm start"
  feed-worker = "npm run worker:feeds"
  search-worker = "npm run worker:search"
  firehose-worker = "npm run worker:firehose"

[[vm]]
  processes = ['firehose-worker']
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1
```

**fly.production.toml**

```toml
[processes]
  web = "npm start"
  feed-worker = "npm run worker:feeds"
  search-worker = "npm run worker:search"
  firehose-worker = "npm run worker:firehose"

[[vm]]
  processes = ['firehose-worker']
  memory = '512mb'
  cpu_kind = 'shared'
  cpus = 1
```

## Configuration

**Environment Variables**

```bash
# Firehose configuration
ATPROTO_FIREHOSE_ENDPOINT=wss://bsky.network
FIREHOSE_RECONNECT_DELAY=3000

# AT Protocol collections (automatically configured by environment)
# Production: network.cosmik.card, network.cosmik.collection, network.cosmik.collectionLink
# Development: network.cosmik.dev.card, network.cosmik.dev.collection, network.cosmik.dev.collectionLink

# Event processing (firehose worker always runs, unlike other workers)
# Other workers skip when USE_IN_MEMORY_EVENTS=true, but firehose worker always runs
```

## Key Architectural Decisions

### 1. Direct Firehose Connection

- **No BullMQ for input**: Firehose events come directly from AT Protocol WebSocket
- **Simpler architecture**: Eliminates unnecessary serialization/deserialization
- **Better reliability**: Direct connection with built-in reconnection logic

### 2. Always-Running Worker

- **Unlike other workers**: Feed/search workers skip when using in-memory events
- **Firehose worker always runs**: It's an external event source, not internal event consumer
- **Environment agnostic**: Works the same in local, dev, and production

### 3. Event Publishing Strategy

- **Input**: Direct AT Protocol firehose (external)
- **Output**: Internal domain events via BullMQ or in-memory based on config
- **Bridge pattern**: Converts external events to internal domain events

### 4. Duplicate Detection

- **Leverages existing publishedRecords table**: No additional event log needed
- **CID-based deduplication**: Uses AT Protocol's content addressing
- **Efficient lookups**: Single table queries for CREATE/UPDATE detection

## Error Handling

- **Network Errors**: Automatic reconnection with exponential backoff
- **Validation Errors**: Log and skip invalid records
- **Processing Errors**: Dead letter queue for failed events
- **Duplicate Detection**: Idempotent processing with CID-based deduplication

## Monitoring & Observability

- **Metrics**: Events processed, duplicates detected, processing latency
- **Logging**: Structured logs for all firehose events
- **Health Checks**: Firehose connection status, processing queue depth
- **Alerts**: Connection failures, high error rates, processing delays

## Testing Strategy

- **Unit Tests**: Individual use cases and services
- **Integration Tests**: End-to-end firehose event processing
- **Mock Firehose**: Test harness for simulating AT Protocol events
- **Load Tests**: High-volume event processing scenarios

## Deployment & Operations

### Process Management

- **Dedicated Worker Process**: Runs independently of web app and other workers
- **Always Active**: Unlike other workers, doesn't skip based on event configuration
- **Automatic Restart**: Fly.io handles process restarts on failure
- **Graceful Shutdown**: Handles SIGTERM/SIGINT for clean shutdowns

### Scaling Considerations

- **Single Instance**: Start with one firehose worker per environment
- **Future Scaling**: Can partition by DID ranges or collection types if needed
- **Cursor Management**: @atproto/sync handles cursor persistence automatically
- **Replay Capability**: Can restart from specific cursor positions

### Monitoring & Observability

- **Connection Health**: Monitor WebSocket connection status
- **Processing Metrics**: Track events processed, duplicates detected, errors
- **Latency Monitoring**: Measure time from firehose event to domain event publication
- **Error Tracking**: Log and alert on processing failures

### Error Handling Strategy

- **Network Errors**: Automatic reconnection with exponential backoff (handled by @atproto/sync)
- **Processing Errors**: Log and continue (don't crash worker for single event failures)
- **Validation Errors**: Skip invalid records with detailed logging
- **Database Errors**: Retry with backoff, dead letter for persistent failures

## Benefits of This Architecture

### 1. Separation of Concerns

- **External Events**: Firehose worker handles AT Protocol events
- **Internal Events**: Other workers handle domain events
- **Clear Boundaries**: No mixing of external and internal event systems

### 2. Reliability

- **Direct Connection**: No intermediate queues that can fail
- **Built-in Resilience**: @atproto/sync handles reconnection and cursor management
- **Idempotent Processing**: Duplicate detection prevents double-processing

### 3. Performance

- **No Serialization Overhead**: Direct event processing
- **Efficient Duplicate Detection**: Single table lookups
- **Minimal Latency**: Direct path from firehose to domain updates

### 4. Maintainability

- **Simple Architecture**: Easy to understand and debug
- **Standard Patterns**: Follows existing DDD and layered architecture
- **Testable**: Clear interfaces for mocking and testing

## Future Enhancements

1. **Server-side Filtering**: Use AT Protocol's filtering capabilities to reduce bandwidth
2. **Multi-PDS Support**: Handle events from multiple Personal Data Servers
3. **Event Sourcing**: Complete audit trail of all processed firehose events
4. **Real-time Sync**: WebSocket updates to web clients for live updates
5. **Analytics Pipeline**: Dedicated analytics worker for metrics and insights
6. **Horizontal Scaling**: Partition processing across multiple firehose workers
