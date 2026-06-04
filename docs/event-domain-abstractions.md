# Domain Event Abstractions in a Clean Architecture

This document explains how to implement a clean, layered domain event system that adheres to clean architecture principles, with clear separation between domain, application, and infrastructure layers.

## Overview

Our domain event system follows a simple, direct approach where:

1. **Domain layer** raises events through aggregates
2. **Application layer** defines interfaces for event publishing
3. **Infrastructure layer** provides concrete implementations
4. **Use cases** explicitly publish events after successful operations

## Core Principle: Dependency Inversion

The key principle is **dependency inversion** - higher layers define interfaces, lower layers implement them:

- **Domain Layer**: Pure business logic, no dependencies
- **Application Layer**: Defines event publishing interfaces
- **Infrastructure Layer**: Implements interfaces with concrete technologies
- **Use Cases**: Orchestrate domain logic and event publishing

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Aggregates    │  │  Domain Events  │  │ Event Types  │ │
│  │                 │  │                 │  │              │ │
│  │ Card.addToLib() │  │  IDomainEvent   │  │ CardAdded... │ │
│  │ ↓ addDomainEvent│  │                 │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                Application Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Use Cases     │  │   Interfaces    │  │ Event Handlers│ │
│  │                 │  │                 │  │              │ │
│  │ AddCardToLib... │  │ IEventPublisher │  │ Notification │ │
│  │ ↓ publishEvents │  │ IEventSubscriber│  │ Feed Handler │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│              Infrastructure Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ BullMQPublisher │  │ BullMQSubscriber│  │ DomainEvents │ │
│  │ (implements     │  │ (implements     │  │ (simplified) │ │
│  │ IEventPublisher)│  │ IEventSubscriber│  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. Domain Layer (Pure Business Logic)

The domain layer remains completely pure and has no dependencies on infrastructure:

```typescript
// src/shared/domain/events/IDomainEvent.ts - NO CHANGES
export interface IDomainEvent {
  dateTimeOccurred: Date;
  getAggregateId(): UniqueEntityID;
}
```

```typescript
// src/modules/cards/domain/events/CardAddedToLibraryEvent.ts - NO CHANGES
export class CardAddedToLibraryEvent implements IDomainEvent {
  public readonly dateTimeOccurred: Date;

  constructor(
    public readonly cardId: CardId,
    public readonly curatorId: CuratorId,
  ) {
    this.dateTimeOccurred = new Date();
  }

  getAggregateId(): UniqueEntityID {
    return this.cardId.getValue();
  }
}
```

```typescript
// src/shared/domain/AggregateRoot.ts - NO CHANGES
export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: IDomainEvent[] = [];

  protected addDomainEvent(domainEvent: IDomainEvent): void {
    this._domainEvents.push(domainEvent);
    DomainEvents.markAggregateForDispatch(this);
    this.logDomainEventAdded(domainEvent);
  }

  // ... rest unchanged
}
```

```typescript
// src/modules/cards/domain/Card.ts - Domain logic unchanged
public addToLibrary(userId: CuratorId): Result<void, CardValidationError> {
  // ... validation logic

  this.props.libraryMemberships.push({
    curatorId: userId,
    addedAt: new Date(),
  });

  // Domain only adds events - doesn't know about publishing
  this.addDomainEvent(new CardAddedToLibraryEvent(this.cardId, userId));

  return ok(undefined);
}
```

### 2. Application Layer (Interfaces and Orchestration)

The application layer defines interfaces and orchestrates domain logic with event publishing:

```typescript
// src/shared/application/events/IEventPublisher.ts
import { IDomainEvent } from '../../domain/events/IDomainEvent';
import { Result } from '../../core/Result';

export interface IEventPublisher {
  publishEvents(events: IDomainEvent[]): Promise<Result<void>>;
}
```

```typescript
// src/shared/application/events/IEventSubscriber.ts
import { IDomainEvent } from '../../domain/events/IDomainEvent';

export interface IEventHandler<T extends IDomainEvent> {
  handle(event: T): Promise<Result<void>>;
}

export interface IEventSubscriber {
  subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: IEventHandler<T>,
  ): Promise<void>;

  start(): Promise<void>;
  stop(): Promise<void>;
}
```

```typescript
// src/shared/application/BaseUseCase.ts
import { IEventPublisher } from './events/IEventPublisher';
import { DomainEvents } from '../domain/events/DomainEvents';
import { AggregateRoot } from '../domain/AggregateRoot';
import { Result, ok, err } from '../core/Result';

export abstract class BaseUseCase {
  constructor(protected eventPublisher: IEventPublisher) {}

  protected async publishEventsForAggregate(
    aggregate: AggregateRoot<any>,
  ): Promise<Result<void>> {
    const events = DomainEvents.getEventsForAggregate(aggregate.id);

    if (events.length === 0) {
      return ok(undefined);
    }

    const publishResult = await this.eventPublisher.publishEvents(events);

    if (publishResult.isOk()) {
      DomainEvents.clearEventsForAggregate(aggregate.id);
    }

    return publishResult;
  }
}
```

### 3. Infrastructure Layer (Concrete Implementations)

The infrastructure layer provides concrete implementations of the application interfaces:

```typescript
// src/shared/infrastructure/events/BullMQEventPublisher.ts
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { IEventPublisher } from '../../application/events/IEventPublisher';
import { IDomainEvent } from '../../domain/events/IDomainEvent';
import { Result, ok, err } from '../../core/Result';

export class BullMQEventPublisher implements IEventPublisher {
  private queues: Map<string, Queue> = new Map();

  constructor(private redisConnection: Redis) {}

  async publishEvents(events: IDomainEvent[]): Promise<Result<void>> {
    try {
      for (const event of events) {
        await this.publishSingleEvent(event);
      }
      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  private async publishSingleEvent(event: IDomainEvent): Promise<void> {
    const queueConfig = this.getQueueConfig(event);

    if (!this.queues.has(queueConfig.name)) {
      this.queues.set(
        queueConfig.name,
        new Queue(queueConfig.name, {
          connection: this.redisConnection,
          defaultJobOptions: queueConfig.options,
        }),
      );
    }

    const queue = this.queues.get(queueConfig.name)!;
    await queue.add(event.constructor.name, {
      ...this.serializeEvent(event),
      eventType: event.constructor.name,
      aggregateId: event.getAggregateId().toString(),
      dateTimeOccurred: event.dateTimeOccurred.toISOString(),
    });
  }

  private getQueueConfig(event: IDomainEvent) {
    // Route events to appropriate queues
    if (event.constructor.name === 'CardAddedToLibraryEvent') {
      return {
        name: 'notifications',
        options: {
          priority: 1,
          attempts: 5,
          backoff: { type: 'exponential' as const, delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      };
    }

    return {
      name: 'events',
      options: {
        priority: 2,
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 2000 },
        removeOnComplete: 50,
        removeOnFail: 25,
      },
    };
  }

  private serializeEvent(event: IDomainEvent): any {
    return {
      ...event,
      // Handle value objects serialization
      cardId: (event as any).cardId?.getValue?.()?.toString(),
      curatorId: (event as any).curatorId?.value,
    };
  }
}
```

```typescript
// src/shared/infrastructure/events/BullMQEventSubscriber.ts
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import {
  IEventSubscriber,
  IEventHandler,
} from '../../application/events/IEventSubscriber';
import { IDomainEvent } from '../../domain/events/IDomainEvent';
import { CardAddedToLibraryEvent } from '../../../modules/cards/domain/events/CardAddedToLibraryEvent';
import { CardId } from '../../../modules/cards/domain/value-objects/CardId';
import { CuratorId } from '../../../modules/cards/domain/value-objects/CuratorId';

export class BullMQEventSubscriber implements IEventSubscriber {
  private workers: Worker[] = [];
  private handlers: Map<string, IEventHandler<any>> = new Map();

  constructor(private redisConnection: Redis) {}

  async subscribe<T extends IDomainEvent>(
    eventType: string,
    handler: IEventHandler<T>,
  ): Promise<void> {
    this.handlers.set(eventType, handler);
  }

  async start(): Promise<void> {
    // Start workers for different queues
    const queues = ['notifications', 'events'];

    for (const queueName of queues) {
      const worker = new Worker(
        queueName,
        async (job: Job) => {
          await this.processJob(job);
        },
        {
          connection: this.redisConnection,
          concurrency: queueName === 'notifications' ? 5 : 15,
        },
      );

      worker.on('completed', (job) => {
        console.log(`Job ${job.id} completed successfully`);
      });

      worker.on('failed', (job, err) => {
        console.error(`Job ${job?.id} failed:`, err);
      });

      this.workers.push(worker);
    }
  }

  async stop(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
    this.workers = [];
  }

  private async processJob(job: Job): Promise<void> {
    const eventData = job.data;
    const eventType = eventData.eventType;

    const handler = this.handlers.get(eventType);
    if (!handler) {
      console.warn(`No handler registered for event type: ${eventType}`);
      return;
    }

    const event = this.reconstructEvent(eventData);
    const result = await handler.handle(event);

    if (result.isErr()) {
      throw result.error;
    }
  }

  private reconstructEvent(eventData: any): IDomainEvent {
    if (eventData.eventType === 'CardAddedToLibraryEvent') {
      const cardId = CardId.create(eventData.cardId).unwrap();
      const curatorId = CuratorId.create(eventData.curatorId).unwrap();

      const event = new CardAddedToLibraryEvent(cardId, curatorId);
      (event as any).dateTimeOccurred = new Date(eventData.dateTimeOccurred);

      return event;
    }

    throw new Error(`Unknown event type: ${eventData.eventType}`);
  }
}
```

## Use Case Implementation

Use cases orchestrate domain logic and event publishing through dependency injection:

```typescript
// src/modules/cards/application/use-cases/AddCardToLibraryUseCase.ts
import { BaseUseCase } from '../../../../shared/application/BaseUseCase';
import { UseCase } from '../../../../shared/core/UseCase';
import { Result, ok, err } from '../../../../shared/core/Result';
import { IEventPublisher } from '../../../../shared/application/events/IEventPublisher';
import { ICardRepository } from '../../domain/ICardRepository';
import { CardId } from '../../domain/value-objects/CardId';
import { CuratorId } from '../../domain/value-objects/CuratorId';

interface AddCardToLibraryRequest {
  cardId: string;
  userId: string;
}

export class AddCardToLibraryUseCase
  extends BaseUseCase
  implements UseCase<AddCardToLibraryRequest, Result<void>>
{
  constructor(
    private cardRepository: ICardRepository,
    eventPublisher: IEventPublisher, // Interface injected
  ) {
    super(eventPublisher);
  }

  async execute(request: AddCardToLibraryRequest): Promise<Result<void>> {
    // 1. Get the card
    const cardResult = await this.cardRepository.findById(
      CardId.create(request.cardId).unwrap(),
    );
    if (cardResult.isErr()) {
      return err(cardResult.error);
    }

    const card = cardResult.value;
    if (!card) {
      return err(new Error('Card not found'));
    }

    // 2. Execute domain logic (adds events to aggregate)
    const curatorId = CuratorId.create(request.userId).unwrap();
    const addResult = card.addToLibrary(curatorId);
    if (addResult.isErr()) {
      return err(addResult.error);
    }

    // 3. Save to repository
    const saveResult = await this.cardRepository.save(card);
    if (saveResult.isErr()) {
      return err(saveResult.error);
    }

    // 4. Publish events after successful save
    const publishResult = await this.publishEventsForAggregate(card);
    if (publishResult.isErr()) {
      console.error('Failed to publish events:', publishResult.error);
      // Don't fail the operation if event publishing fails
    }

    return ok(undefined);
  }
}
```

## Event Handler Implementation

Event handlers implement the application interface and contain business logic:

```typescript
// src/modules/notifications/application/eventHandlers/CardAddedToLibraryEventHandler.ts
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { CardAddedToLibraryEvent } from '../../../cards/domain/events/CardAddedToLibraryEvent';
import { INotificationService } from '../ports/INotificationService';
import { Result } from '../../../../shared/core/Result';

export class CardAddedToLibraryEventHandler implements IEventHandler<CardAddedToLibraryEvent> {
  constructor(private notificationService: INotificationService) {}

  async handle(event: CardAddedToLibraryEvent): Promise<Result<void>> {
    return await this.notificationService.processCardAddedToLibrary(event);
  }
}
```

## Dependency Injection and Service Factory

The service factory wires up concrete implementations:

```typescript
// src/shared/infrastructure/ServiceFactory.ts
import { IEventPublisher } from '../application/events/IEventPublisher';
import { IEventSubscriber } from '../application/events/IEventSubscriber';
import { BullMQEventPublisher } from './events/BullMQEventPublisher';
import { BullMQEventSubscriber } from './events/BullMQEventSubscriber';
import { AddCardToLibraryUseCase } from '../../modules/cards/application/use-cases/AddCardToLibraryUseCase';
import { CardAddedToLibraryEventHandler as NotificationHandler } from '../../modules/notifications/application/eventHandlers/CardAddedToLibraryEventHandler';
import { CardAddedToLibraryEventHandler as FeedHandler } from '../../modules/feeds/application/eventHandlers/CardAddedToLibraryEventHandler';

export class ServiceFactory {
  static create(
    configService: EnvironmentConfigService,
    repositories: Repositories,
  ): Services {
    // Infrastructure - Redis connection
    const redisConnection = createRedisConnection();

    // Infrastructure - Event publisher implementation
    const eventPublisher: IEventPublisher = new BullMQEventPublisher(
      redisConnection,
    );

    // Infrastructure - Event subscriber implementation
    const eventSubscriber: IEventSubscriber = new BullMQEventSubscriber(
      redisConnection,
    );

    // Application - Use cases with injected interfaces
    const addCardToLibraryUseCase = new AddCardToLibraryUseCase(
      repositories.cardRepository,
      eventPublisher, // Interface injected
    );

    // Application - Event handlers
    const notificationHandler = new NotificationHandler(notificationService);
    const feedHandler = new FeedHandler(feedService);

    // Register event handlers with subscriber
    eventSubscriber.subscribe('CardAddedToLibraryEvent', notificationHandler);
    eventSubscriber.subscribe('CardAddedToLibraryEvent', feedHandler);

    return {
      // Use cases
      addCardToLibraryUseCase,

      // Event system
      eventPublisher,
      eventSubscriber,

      // Event handlers
      notificationHandler,
      feedHandler,
    };
  }
}
```

## Worker Process Setup

Workers are separate processes that run the event subscriber:

```typescript
// src/workers/notification-worker.ts
import { ServiceFactory } from '../shared/infrastructure/ServiceFactory';
import { EnvironmentConfigService } from '../shared/infrastructure/config/EnvironmentConfigService';

async function startNotificationWorker() {
  const configService = new EnvironmentConfigService();
  const repositories = createRepositories(configService);
  const services = ServiceFactory.create(configService, repositories);

  // Start the event subscriber
  await services.eventSubscriber.start();

  console.log('Notification worker started');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('Shutting down notification worker...');
    await services.eventSubscriber.stop();
    process.exit(0);
  });
}

startNotificationWorker().catch(console.error);
```

## Testing Strategy

### 1. Domain Tests (Unchanged)

Domain tests remain pure and don't need infrastructure:

```typescript
describe('Card', () => {
  it('should raise CardAddedToLibraryEvent when added to library', () => {
    const card = Card.create(cardProps).unwrap();
    const userId = CuratorId.create('did:plc:user123').unwrap();

    card.addToLibrary(userId);

    expect(card.domainEvents).toHaveLength(1);
    expect(card.domainEvents[0]).toBeInstanceOf(CardAddedToLibraryEvent);
  });
});
```

### 2. Use Case Tests (Mock Interfaces)

Use case tests mock the application interfaces:

```typescript
describe('AddCardToLibraryUseCase', () => {
  it('should publish events after successful save', async () => {
    const mockEventPublisher: IEventPublisher = {
      publishEvents: jest.fn().mockResolvedValue(ok(undefined)),
    };

    const mockCardRepository: ICardRepository = {
      findById: jest.fn().mockResolvedValue(ok(mockCard)),
      save: jest.fn().mockResolvedValue(ok(undefined)),
    };

    const useCase = new AddCardToLibraryUseCase(
      mockCardRepository,
      mockEventPublisher,
    );

    const result = await useCase.execute({
      cardId: 'card-123',
      userId: 'user-456',
    });

    expect(result.isOk()).toBe(true);
    expect(mockEventPublisher.publishEvents).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(CardAddedToLibraryEvent)]),
    );
  });
});
```

### 3. Integration Tests (Real Infrastructure)

Integration tests use real implementations:

```typescript
describe('BullMQ Event System Integration', () => {
  let eventPublisher: BullMQEventPublisher;
  let eventSubscriber: BullMQEventSubscriber;
  let redis: Redis;

  beforeEach(async () => {
    redis = new Redis(process.env.TEST_REDIS_URL);
    eventPublisher = new BullMQEventPublisher(redis);
    eventSubscriber = new BullMQEventSubscriber(redis);
  });

  it('should publish and process events end-to-end', async () => {
    const mockHandler: IEventHandler<CardAddedToLibraryEvent> = {
      handle: jest.fn().mockResolvedValue(ok(undefined)),
    };

    await eventSubscriber.subscribe('CardAddedToLibraryEvent', mockHandler);
    await eventSubscriber.start();

    const event = new CardAddedToLibraryEvent(cardId, userId);
    await eventPublisher.publishEvents([event]);

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(mockHandler.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: expect.any(CardId),
        curatorId: expect.any(CuratorId),
      }),
    );

    await eventSubscriber.stop();
  });
});
```

## Migration Strategy

### Phase 1: Create Application Interfaces

1. Define `IEventPublisher` and `IEventSubscriber` interfaces
2. Create `BaseUseCase` with event publishing logic
3. No changes to domain or existing infrastructure

### Phase 2: Implement Infrastructure

1. Create `BullMQEventPublisher` and `BullMQEventSubscriber`
2. Update `ServiceFactory` to inject concrete implementations
3. Deploy with Redis infrastructure

### Phase 3: Update Use Cases

1. Extend use cases from `BaseUseCase`
2. Inject `IEventPublisher` through constructor
3. Replace direct event handling with publishing

### Phase 4: Deploy Workers

1. Create worker processes using `IEventSubscriber`
2. Register event handlers with subscriber
3. Scale workers based on load

## Key Benefits of This Approach

### 1. **Clean Architecture Compliance**

- Clear separation of concerns across layers
- Dependency inversion principle followed
- Interfaces defined in application layer

### 2. **Testability**

- Easy to mock interfaces for unit tests
- Domain tests remain pure and fast
- Integration tests can use real implementations

### 3. **Flexibility**

- Can switch from BullMQ to other queue systems
- Can add multiple publishers (e.g., event store + queue)
- Easy to add new event types and handlers

### 4. **Maintainability**

- Clear contracts between layers
- Infrastructure changes don't affect application logic
- Easy to understand and debug

### 5. **Scalability**

- Publishers and subscribers can scale independently
- Different queue configurations per event type
- Workers can be deployed across multiple regions

## Alternative Implementations

The interface-based approach allows for easy swapping of implementations:

```typescript
// Alternative: In-memory publisher for testing
export class InMemoryEventPublisher implements IEventPublisher {
  public publishedEvents: IDomainEvent[] = [];

  async publishEvents(events: IDomainEvent[]): Promise<Result<void>> {
    this.publishedEvents.push(...events);
    return ok(undefined);
  }
}

// Alternative: Event store publisher for audit
export class EventStorePublisher implements IEventPublisher {
  constructor(private eventStore: IEventStore) {}

  async publishEvents(events: IDomainEvent[]): Promise<Result<void>> {
    for (const event of events) {
      await this.eventStore.append(event);
    }
    return ok(undefined);
  }
}

// Composite publisher for multiple destinations
export class CompositeEventPublisher implements IEventPublisher {
  constructor(private publishers: IEventPublisher[]) {}

  async publishEvents(events: IDomainEvent[]): Promise<Result<void>> {
    for (const publisher of this.publishers) {
      const result = await publisher.publishEvents(events);
      if (result.isErr()) {
        return result;
      }
    }
    return ok(undefined);
  }
}
```

## Conclusion

This clean architecture approach provides:

- **Domain Purity**: Domain layer has zero infrastructure dependencies
- **Clear Contracts**: Interfaces define exactly what each layer needs
- **Flexibility**: Easy to swap implementations or add new ones
- **Testability**: Mock interfaces for fast, reliable tests
- **Scalability**: Infrastructure can scale independently

The key insight is that **clean architecture principles apply to event systems too** - define interfaces in the application layer, implement them in infrastructure, and inject them through constructors. This creates a maintainable, testable, and flexible event-driven system.
