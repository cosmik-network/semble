# Domain Events Guide

This document summarizes how domain events are structured, published, and handled in the codebase, along with a checklist for adding new events.

---

## Architecture Overview

The event system uses **BullMQ** (Redis-backed queues) for asynchronous event processing. Events flow through these layers:

```
Domain Entity → Use Case → Event Publisher → Redis Queue → Worker → Event Handler/Saga
```

---

## Key Files & Components

| Component            | Location                                                           | Purpose                                                |
| -------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| Event Names Registry | `src/shared/infrastructure/events/EventConfig.ts`                  | Central registry of all event type names               |
| Event Publisher      | `src/shared/infrastructure/events/BullMQEventPublisher.ts`         | Routes events to appropriate queues                    |
| Event Subscriber     | `src/shared/infrastructure/events/BullMQEventSubscriber.ts`        | Consumes events from queues and dispatches to handlers |
| Event Mapper         | `src/shared/infrastructure/events/EventMapper.ts`                  | Serializes/deserializes events for transport           |
| Queue Config         | `src/shared/infrastructure/events/QueueConfig.ts`                  | Queue names and options                                |
| Worker Process       | `src/shared/infrastructure/processes/NotificationWorkerProcess.ts` | Initializes subscribers and registers handlers         |

---

## Checklist: Adding a New Domain Event

### 1. Register the Event Name

**File:** `src/shared/infrastructure/events/EventConfig.ts`

```typescript
export const EventNames = {
  // ... existing events
  YOUR_NEW_EVENT: 'YourNewEventEvent',
} as const;
```

### 2. Create the Domain Event Class

**Location:** `src/modules/<module>/domain/events/YourNewEvent.ts`

Required structure:

```typescript
import { IDomainEvent } from '../../../../shared/domain/events/IDomainEvent';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { EventNames } from '../../../../shared/infrastructure/events/EventConfig';
import { Result, ok } from '../../../../shared/core/Result';

export class YourNewEvent implements IDomainEvent {
  public readonly eventName = EventNames.YOUR_NEW_EVENT;
  public readonly dateTimeOccurred: Date;

  private constructor(
    public readonly someId: SomeValueObject,
    dateTimeOccurred?: Date,
  ) {
    this.dateTimeOccurred = dateTimeOccurred || new Date();
  }

  public static create(someId: SomeValueObject): Result<YourNewEvent> {
    return ok(new YourNewEvent(someId));
  }

  public static reconstruct(
    someId: SomeValueObject,
    dateTimeOccurred: Date,
  ): Result<YourNewEvent> {
    return ok(new YourNewEvent(someId, dateTimeOccurred));
  }

  getAggregateId(): UniqueEntityID {
    return this.someId.getValue();
  }
}
```

### 3. Raise the Event in the Domain Entity

**Location:** Domain entity method (e.g., `src/modules/cards/domain/Card.ts`)

```typescript
import { YourNewEvent } from './events/YourNewEvent';

// Inside the domain method that triggers the event:
public doSomething(): Result<void> {
  // ... business logic ...

  const domainEvent = YourNewEvent.create(this.someId);
  if (domainEvent.isErr()) {
    return err(new ValidationError(domainEvent.error.message));
  }
  this.addDomainEvent(domainEvent.value);

  return ok(undefined);
}
```

### 4. Update the Event Mapper

**File:** `src/shared/infrastructure/events/EventMapper.ts`

**Step 4a:** Add the import:

```typescript
import { YourNewEvent } from '../../../modules/<module>/domain/events/YourNewEvent';
```

**Step 4b:** Add the serialized interface:

```typescript
export interface SerializedYourNewEvent extends SerializedEvent {
  eventType: typeof EventNames.YOUR_NEW_EVENT;
  someId: string;
  // ... other properties
}
```

**Step 4c:** Add to the union type:

```typescript
export type SerializedEventUnion =
  | SerializedCardAddedToLibraryEvent
  // ... other events
  | SerializedYourNewEvent;
```

**Step 4d:** Add serialization in `toSerialized()`:

```typescript
if (event instanceof YourNewEvent) {
  return {
    eventType: EventNames.YOUR_NEW_EVENT,
    aggregateId: event.getAggregateId().toString(),
    dateTimeOccurred: event.dateTimeOccurred.toISOString(),
    someId: event.someId.getValue().toString(),
  };
}
```

**Step 4e:** Add deserialization in `fromSerialized()`:

```typescript
case EventNames.YOUR_NEW_EVENT: {
  const someId = SomeId.createFromString(eventData.someId).unwrap();
  const dateTimeOccurred = new Date(eventData.dateTimeOccurred);
  return YourNewEvent.reconstruct(someId, dateTimeOccurred).unwrap();
}
```

### 5. Configure Queue Routing

**File:** `src/shared/infrastructure/events/BullMQEventPublisher.ts`

Update `getTargetQueues()` to route the event to appropriate queues:

```typescript
private getTargetQueues(eventName: EventName): QueueName[] {
  switch (eventName) {
    // ... existing cases
    case EventNames.YOUR_NEW_EVENT:
      return [QueueNames.NOTIFICATIONS]; // or multiple queues
    default:
      return [QueueNames.FEEDS];
  }
}
```

### 6. Publish Events from the Use Case

**File:** The use case that performs the action (e.g., `src/modules/<module>/application/useCases/commands/YourUseCase.ts`)

Extend `BaseUseCase` and call `publishEventsForAggregate()`:

```typescript
import { BaseUseCase } from '../../../../../shared/core/UseCase';
import { IEventPublisher } from '../../../../../shared/application/events/IEventPublisher';

export class YourUseCase extends BaseUseCase<RequestDTO, Result<ResponseDTO>> {
  constructor(
    private repository: IRepository,
    eventPublisher: IEventPublisher,
  ) {
    super(eventPublisher);
  }

  async execute(request: RequestDTO): Promise<Result<ResponseDTO>> {
    // ... business logic that raises domain events ...

    // Publish events for the aggregate
    const publishResult = await this.publishEventsForAggregate(entity);
    if (publishResult.isErr()) {
      console.error('Failed to publish events:', publishResult.error);
      // Don't fail the operation if event publishing fails
    }

    return ok(response);
  }
}
```

### 7. Update UseCaseFactory

**File:** `src/shared/infrastructure/http/factories/UseCaseFactory.ts`

Pass `eventPublisher` to the use case constructor:

```typescript
yourUseCase: new YourUseCase(
  repositories.someRepository,
  services.eventPublisher,
),
```

### 8. Create the Event Handler

**Location:** `src/modules/<module>/application/eventHandlers/YourNewEventHandler.ts`

```typescript
import { YourNewEvent } from '../../../<module>/domain/events/YourNewEvent';
import { IEventHandler } from '../../../../shared/application/events/IEventSubscriber';
import { Result, ok } from '../../../../shared/core/Result';

export class YourNewEventHandler implements IEventHandler<YourNewEvent> {
  constructor(private someDependency: ISomeDependency) {}

  async handle(event: YourNewEvent): Promise<Result<void>> {
    // Handle the event
    return ok(undefined);
  }
}
```

### 9. Register the Handler in the Worker Process

**File:** `src/shared/infrastructure/processes/NotificationWorkerProcess.ts` (or appropriate worker)

```typescript
import { YourNewEventHandler } from '../../../modules/<module>/application/eventHandlers/YourNewEventHandler';

// In the initialization:
const yourNewEventHandler = new YourNewEventHandler(dependencies);

await subscriber.subscribe(EventNames.YOUR_NEW_EVENT, yourNewEventHandler);
```

---

## Event Aggregation with Sagas

For events that need to be bundled or coordinated, use a saga pattern:

**Example:** `src/modules/notifications/application/sagas/CardNotificationSaga.ts`

Sagas can:

- Aggregate multiple events within a time window
- Store pending state in Redis via `ISagaStateStore`
- Create consolidated notifications

Handler delegates to saga:

```typescript
export class YourEventHandler implements IEventHandler<YourEvent> {
  constructor(private saga: YourSaga) {}

  async handle(event: YourEvent): Promise<Result<void>> {
    return this.saga.handleEvent(event);
  }
}
```

---

## Summary Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PUBLISHING SIDE                              │
├─────────────────────────────────────────────────────────────────────┤
│  Domain Entity                                                       │
│    └── Raises event via this.addDomainEvent()                       │
│            ↓                                                         │
│  Use Case (extends BaseUseCase)                                      │
│    └── Calls publishEventsForAggregate()                            │
│            ↓                                                         │
│  BullMQEventPublisher                                                │
│    ├── EventMapper.toSerialized() - converts to JSON                │
│    └── getTargetQueues() - routes to appropriate queue(s)           │
│            ↓                                                         │
│  Redis Queues (FEEDS, SEARCH, NOTIFICATIONS)                        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        CONSUMING SIDE                                │
├─────────────────────────────────────────────────────────────────────┤
│  Worker Process (e.g., NotificationWorkerProcess)                    │
│    └── Creates BullMQEventSubscriber                                │
│            ↓                                                         │
│  BullMQEventSubscriber                                               │
│    ├── Listens to queue                                             │
│    ├── EventMapper.fromSerialized() - reconstructs event            │
│    └── Dispatches to registered handler                             │
│            ↓                                                         │
│  Event Handler / Saga                                                │
│    └── Processes event (creates notifications, updates state, etc.) │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference: Files to Touch for a New Event

1. `src/shared/infrastructure/events/EventConfig.ts` — Add event name
2. `src/modules/<module>/domain/events/YourNewEvent.ts` — Create event class
3. `src/modules/<module>/domain/<Entity>.ts` — Raise event in domain method
4. `src/shared/infrastructure/events/EventMapper.ts` — Add serialization/deserialization
5. `src/shared/infrastructure/events/BullMQEventPublisher.ts` — Configure queue routing
6. `src/modules/<module>/application/useCases/...UseCase.ts` — Extend BaseUseCase, publish events
7. `src/shared/infrastructure/http/factories/UseCaseFactory.ts` — Pass eventPublisher
8. `src/modules/<module>/application/eventHandlers/...Handler.ts` — Create handler
9. `src/shared/infrastructure/processes/<Worker>Process.ts` — Register handler
