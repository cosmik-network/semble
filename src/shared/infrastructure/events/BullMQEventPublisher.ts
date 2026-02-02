import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { IEventPublisher } from '../../application/events/IEventPublisher';
import { IDomainEvent } from '../../domain/events/IDomainEvent';
import { Result, ok, err } from '../../core/Result';
import { QueueNames, QueueOptions, QueueName } from './QueueConfig';
import { EventMapper } from './EventMapper';
import { EventName, EventNames } from './EventConfig';

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
    const targetQueues = this.getTargetQueues(event.eventName);

    for (const queueName of targetQueues) {
      await this.publishToQueue(queueName, event);
    }
  }

  private async publishToQueue(
    queueName: QueueName,
    event: IDomainEvent,
  ): Promise<void> {
    if (!this.queues.has(queueName)) {
      this.queues.set(
        queueName,
        new Queue(queueName, {
          connection: this.redisConnection,
          defaultJobOptions: QueueOptions[queueName],
        }),
      );
    }

    const queue = this.queues.get(queueName)!;
    const serializedEvent = EventMapper.toSerialized(event);
    await queue.add(serializedEvent.eventType, serializedEvent);
  }

  private getTargetQueues(eventName: EventName): QueueName[] {
    switch (eventName) {
      case EventNames.CARD_ADDED_TO_LIBRARY:
        return [
          QueueNames.FEEDS,
          QueueNames.SEARCH,
          QueueNames.NOTIFICATIONS,
          QueueNames.SYNC,
        ];
      case EventNames.CARD_ADDED_TO_COLLECTION:
        return [QueueNames.FEEDS, QueueNames.NOTIFICATIONS];
      case EventNames.CARD_REMOVED_FROM_LIBRARY:
        return [QueueNames.NOTIFICATIONS];
      case EventNames.CARD_REMOVED_FROM_COLLECTION:
        return [QueueNames.NOTIFICATIONS];
      default:
        return [QueueNames.FEEDS];
    }
  }

  async close(): Promise<void> {
    await Promise.all(
      Array.from(this.queues.values()).map((queue) => queue.close()),
    );
  }
}
