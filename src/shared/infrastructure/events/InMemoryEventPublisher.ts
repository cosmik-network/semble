import { IEventPublisher } from '../../application/events/IEventPublisher';
import { IDomainEvent } from '../../domain/events/IDomainEvent';
import { Result, ok } from '../../core/Result';

export class InMemoryEventPublisher implements IEventPublisher {
  private static subscribers: Map<
    string,
    Array<(event: IDomainEvent) => Promise<void>>
  > = new Map();

  async publishEvents(events: IDomainEvent[]): Promise<Result<void>> {
    for (const event of events) {
      await this.publishSingleEvent(event);
    }
    return ok(undefined);
  }

  private async publishSingleEvent(event: IDomainEvent): Promise<void> {
    const handlers =
      InMemoryEventPublisher.subscribers.get(event.eventName) || [];

    // Process handlers asynchronously but don't wait for them
    // This simulates the async nature of real message queues
    setImmediate(async () => {
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (error) {
          console.error(`Error handling event ${event.eventName}:`, error);
        }
      }
    });
  }

  static addSubscriber(
    eventType: string,
    handler: (event: IDomainEvent) => Promise<void>,
  ): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
  }

  static clearSubscribers(): void {
    this.subscribers.clear();
  }
}
