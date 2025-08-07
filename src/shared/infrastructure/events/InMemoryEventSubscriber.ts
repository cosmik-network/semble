import {
  IEventSubscriber,
  IEventHandler,
} from '../../application/events/IEventSubscriber';
import { IDomainEvent } from '../../domain/events/IDomainEvent';
import { InMemoryEventPublisher } from './InMemoryEventPublisher';
import { EventName } from './EventConfig';

export class InMemoryEventSubscriber implements IEventSubscriber {
  private handlers: Map<EventName, IEventHandler<any>> = new Map();
  private isStarted = false;

  async subscribe<T extends IDomainEvent>(
    eventType: EventName,
    handler: IEventHandler<T>,
  ): Promise<void> {
    this.handlers.set(eventType, handler);

    // Register with the static publisher
    InMemoryEventPublisher.addSubscriber(
      eventType,
      async (event: IDomainEvent) => {
        const result = await handler.handle(event as T);
        if (result.isErr()) {
          throw result.error;
        }
      },
    );
  }

  async start(): Promise<void> {
    this.isStarted = true;
    console.log('InMemoryEventSubscriber started');
  }

  async stop(): Promise<void> {
    this.isStarted = false;
    console.log('InMemoryEventSubscriber stopped');
  }
}
