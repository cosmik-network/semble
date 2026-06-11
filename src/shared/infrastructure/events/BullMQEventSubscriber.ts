import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import {
  IEventSubscriber,
  IEventHandler,
} from '../../application/events/IEventSubscriber';
import { IDomainEvent } from '../../domain/events/IDomainEvent';
import { QueueOptions, QueueName } from './QueueConfig';
import { EventMapper } from './EventMapper';
import { EventName } from './EventConfig';

export interface BullMQEventSubscriberConfig {
  queueName: QueueName;
  concurrency?: number;
}

export class BullMQEventSubscriber implements IEventSubscriber {
  private workers: Worker[] = [];
  private handlers: Map<EventName, IEventHandler<any>[]> = new Map();
  private config: BullMQEventSubscriberConfig;

  constructor(
    private redisConnection: Redis,
    config: BullMQEventSubscriberConfig,
  ) {
    this.config = config;
  }

  async subscribe<T extends IDomainEvent>(
    eventType: EventName,
    handler: IEventHandler<T>,
  ): Promise<void> {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  async start(): Promise<void> {
    const queueConfig = QueueOptions[this.config.queueName];
    const concurrency =
      this.config.concurrency || queueConfig.concurrency || 10;

    const worker = new Worker(
      this.config.queueName,
      async (job: Job) => {
        await this.processJob(job);
      },
      {
        connection: this.redisConnection,
        concurrency,
      },
    );

    worker.on('completed', (job) => {
      console.log(
        `[${this.config.queueName}] Job ${job.id} completed successfully`,
      );
    });

    worker.on('failed', (job, err) => {
      console.error(`[${this.config.queueName}] Job ${job?.id} failed:`, err);
    });

    worker.on('error', (err) => {
      console.error(`[${this.config.queueName}] Worker error:`, err);
    });

    this.workers.push(worker);
  }

  async stop(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
    this.workers = [];
  }

  private async processJob(job: Job): Promise<void> {
    const eventData = job.data;
    const eventType = eventData.eventType;

    const handlers = this.handlers.get(eventType);
    if (!handlers || handlers.length === 0) {
      console.warn(
        `[${this.config.queueName}] No handler registered for event type: ${eventType}`,
      );
      return;
    }

    const event = this.reconstructEvent(eventData);

    // Run all handlers concurrently. A failure in one must not block others
    // (matches InMemoryEventPublisher's per-handler isolation). Throw at the
    // end so BullMQ retries the job if any handler failed.
    const results = await Promise.allSettled(
      handlers.map((h) => h.handle(event)),
    );

    const errors: unknown[] = [];
    for (const r of results) {
      if (r.status === 'rejected') {
        errors.push(r.reason);
      } else if (r.value.isErr()) {
        errors.push(r.value.error);
      }
    }

    if (errors.length > 0) {
      for (const e of errors) {
        console.error(
          `[${this.config.queueName}] Handler error for ${eventType}:`,
          e,
        );
      }
      throw errors[0];
    }
  }

  private reconstructEvent(eventData: any): IDomainEvent {
    return EventMapper.fromSerialized(eventData);
  }
}
