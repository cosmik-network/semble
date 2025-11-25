import { Result, ok } from 'src/shared/core/Result';
import { ProcessFirehoseEventUseCase } from '../useCases/ProcessFirehoseEventUseCase';
import { FirehoseEvent } from '../../domain/FirehoseEvent';

interface QueuedEvent {
  event: FirehoseEvent;
  receivedAt: Date;
}

export class FirehoseEventHandler {
  private eventQueue: QueuedEvent[] = [];
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(
    private processFirehoseEventUseCase: ProcessFirehoseEventUseCase,
    private delayMs: number = 3000, // 3 seconds default
  ) {
    // Start processing queue
    this.startQueueProcessor();
  }

  async handle(event: FirehoseEvent): Promise<Result<void>> {
    // Add to queue instead of processing immediately
    this.eventQueue.push({
      event,
      receivedAt: new Date(),
    });
    return ok(undefined);
  }

  private startQueueProcessor(): void {
    this.processingInterval = setInterval(async () => {
      if (this.isProcessing || this.eventQueue.length === 0) return;

      this.isProcessing = true;
      const now = new Date();

      // Find events ready to process (older than delay)
      const readyEvents = this.eventQueue.filter(
        (item) => now.getTime() - item.receivedAt.getTime() >= this.delayMs,
      );

      // Remove processed events from queue
      this.eventQueue = this.eventQueue.filter(
        (item) => now.getTime() - item.receivedAt.getTime() < this.delayMs,
      );

      // Process events in order
      for (const { event } of readyEvents) {
        const result = await this.processFirehoseEventUseCase.execute({
          atUri: event.atUri.value,
          cid: event.cid,
          eventType: event.eventType,
          record: event.record,
        });

        if (result.isErr()) {
          console.error(
            '[FIREHOSE] Failed to process delayed firehose event:',
            result.error,
          );
        }
      }

      this.isProcessing = false;
    }, 1000); // Check every second
  }

  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    this.eventQueue = [];
  }
}
