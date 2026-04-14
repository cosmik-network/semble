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
    // Fire and forget - don't await, just catch errors silently
    this.publishEventsAsync(events).catch((error) => {
      console.error('[BullMQEventPublisher] Failed to publish events:', error);
    });

    return ok(undefined);
  }

  private async publishEventsAsync(events: IDomainEvent[]): Promise<void> {
    // Group events by queue to enable batch publishing
    const eventsByQueue = new Map<QueueName, IDomainEvent[]>();

    for (const event of events) {
      const targetQueues = this.getTargetQueues(event.eventName);

      for (const queueName of targetQueues) {
        if (!eventsByQueue.has(queueName)) {
          eventsByQueue.set(queueName, []);
        }
        eventsByQueue.get(queueName)!.push(event);
      }
    }

    // Publish all events to each queue in batch
    const publishPromises: Promise<void>[] = [];

    for (const [queueName, queueEvents] of eventsByQueue.entries()) {
      publishPromises.push(this.publishBatchToQueue(queueName, queueEvents));
    }

    await Promise.all(publishPromises);
  }

  private async publishBatchToQueue(
    queueName: QueueName,
    events: IDomainEvent[],
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

    // Use addBulk for batch publishing
    const jobs = events.map((event) => {
      const serializedEvent = EventMapper.toSerialized(event);
      return {
        name: serializedEvent.eventType,
        data: serializedEvent,
      };
    });

    await queue.addBulk(jobs);
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
      case EventNames.USER_FOLLOWED_TARGET:
        return [QueueNames.NOTIFICATIONS];
      case EventNames.USER_UNFOLLOWED_TARGET:
        return [QueueNames.NOTIFICATIONS];
      case EventNames.CONNECTION_CREATED:
        return [QueueNames.FEEDS, QueueNames.NOTIFICATIONS, QueueNames.SEARCH];
      case EventNames.CONNECTION_REMOVED:
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
