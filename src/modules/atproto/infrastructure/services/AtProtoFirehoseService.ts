import { Firehose, MemoryRunner, Event } from '@atproto/sync';
import { IFirehoseService } from '../../application/services/IFirehoseService';
import { FirehoseEventHandler } from '../../application/handlers/FirehoseEventHandler';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';
import { IdResolver } from '@atproto/identity';
import { FirehoseEvent } from '../../domain/FirehoseEvent';

const DEBUG_LOGGING = true; // Set to false to disable debug logs

export class AtProtoFirehoseService implements IFirehoseService {
  private firehose?: Firehose;
  private runner?: MemoryRunner;
  private isRunningFlag = false;
  private lastEventTime?: number;
  private connectionMonitor?: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isReconnecting = false;

  constructor(
    private firehoseEventHandler: FirehoseEventHandler,
    private configService: EnvironmentConfigService,
    private idResolver: IdResolver,
  ) {}

  async start(): Promise<void> {
    if (this.isRunningFlag) {
      return;
    }

    try {
      console.log(
        `[FIREHOSE] Starting AT Protocol firehose service for collections: ${this.getFilteredCollections().join(', ')}`,
      );

      const runner = new MemoryRunner({});
      this.runner = runner;

      this.firehose = new Firehose({
        service: this.configService.getAtProtoConfig().firehoseWebsocket,
        filterCollections: this.getFilteredCollections(),
        excludeIdentity: true,
        excludeAccount: true,
        excludeSync: true,
        subscriptionReconnectDelay: 5000, // 5 second delay between reconnects
        handleEvent: this.handleFirehoseEvent.bind(this),
        onError: this.handleError.bind(this),
      });

      // Don't await - this is a long-running operation
      this.firehose.start().catch((error: any) => {
        console.error('[FIREHOSE] Firehose start failed:', error);
        this.reconnect();
      });

      this.isRunningFlag = true;
      this.reconnectAttempts = 0; // Reset on successful start
      this.startConnectionMonitoring();
      console.log('[FIREHOSE] AT Protocol firehose service started');
    } catch (error) {
      console.error('[FIREHOSE] Failed to start firehose:', error);
      await this.reconnect();
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunningFlag) {
      return;
    }

    console.log('[FIREHOSE] Stopping AT Protocol firehose service...');

    this.stopConnectionMonitoring();

    if (this.firehose) {
      await this.firehose.destroy();
      this.firehose = undefined;
    }

    if (this.runner) {
      await this.runner.destroy();
      this.runner = undefined;
    }

    this.isRunningFlag = false;
    console.log('[FIREHOSE] AT Protocol firehose service stopped');
  }

  isRunning(): boolean {
    return (
      (this.isRunningFlag &&
        this.firehose &&
        !((this.firehose as any).abortController?.signal?.aborted ?? false)) ||
      false
    );
  }

  private startConnectionMonitoring(): void {
    this.connectionMonitor = setInterval(() => {
      const now = Date.now();
      const isConnected = this.isRunning();
      const timeSinceLastEvent = this.lastEventTime
        ? now - this.lastEventTime
        : null;

      console.log(
        `[FIREHOSE] [HEALTH] Connected: ${isConnected}, Last event: ${
          this.lastEventTime
            ? `${Math.round(timeSinceLastEvent! / 1000)}s ago`
            : 'never'
        }, Reconnect attempts: ${this.reconnectAttempts}`,
      );

      // Check if connection appears dead
      if (!isConnected) {
        console.warn(
          '[FIREHOSE] [HEALTH] Connection appears dead, attempting reconnect',
        );
        this.reconnect();
        return;
      }

      // Check if we haven't received events for too long (10 minutes)
      // Note: AT Protocol firehose should have regular activity
      if (this.lastEventTime && timeSinceLastEvent! > 60000 * 60 * 2) {
        console.warn(
          '[FIREHOSE] [HEALTH] No events for 2 hours, forcing reconnect',
        );
        this.reconnect();
        return;
      }

      // Check if aborted but still marked as running
      if ((this.firehose as any)?.abortController?.signal?.aborted) {
        console.warn(
          '[FIREHOSE] [HEALTH] Connection aborted but still marked running, reconnecting',
        );
        this.reconnect();
        return;
      }
    }, 60000); // Check every minute
  }

  private stopConnectionMonitoring(): void {
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
      this.connectionMonitor = undefined;
    }
  }

  private async handleFirehoseEvent(evt: Event): Promise<void> {
    try {
      this.lastEventTime = Date.now(); // Track when we last received an event

      if (DEBUG_LOGGING) {
        console.log(
          `[FIREHOSE] Processing firehose event: ${evt.event} for ${evt.did}`,
        );
      }

      // Create FirehoseEvent value object (includes filtering logic)
      const firehoseEventResult = FirehoseEvent.fromEvent(evt);
      if (firehoseEventResult.isErr()) {
        // Only log actual errors, not filtered events
        if (!firehoseEventResult.error.message.includes('is not processable')) {
          console.error(
            '[FIREHOSE] Failed to create FirehoseEvent:',
            firehoseEventResult.error,
          );
        }
        return;
      }

      if (DEBUG_LOGGING) {
        console.log(
          `[FIREHOSE] Successfully created FirehoseEvent, passing to handler`,
        );
      }

      const result = await this.firehoseEventHandler.handle(
        firehoseEventResult.value,
      );

      if (result.isErr()) {
        console.error(
          '[FIREHOSE] Failed to process firehose event:',
          result.error,
        );
      } else if (DEBUG_LOGGING) {
        console.log(`[FIREHOSE] Successfully processed event`);
      }
    } catch (error) {
      console.error(
        '[FIREHOSE] Unhandled error in handleFirehoseEvent:',
        error,
      );
      // Don't re-throw - let processing continue
    }
  }

  private handleError(err: Error): void {
    console.error('[FIREHOSE] Firehose error:', err.name, err.message);

    // Log different error types for debugging
    if (err.name === 'FirehoseParseError') {
      console.warn('[FIREHOSE] Parse error - continuing without reconnect');
      return;
    }

    if (err.name === 'FirehoseValidationError') {
      console.warn(
        '[FIREHOSE] Validation error - continuing without reconnect',
      );
      return;
    }

    // For subscription errors and others, attempt reconnect
    console.log('[FIREHOSE] Connection error detected, will attempt reconnect');
    if (this.isRunningFlag) {
      this.reconnect();
    }
  }

  private async reconnect(): Promise<void> {
    if (this.isReconnecting) {
      console.log('[FIREHOSE] Reconnect already in progress, skipping');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `[FIREHOSE] Max reconnect attempts (${this.maxReconnectAttempts}) reached. Stopping service.`,
      );
      await this.stop();
      return;
    }

    this.isReconnecting = true;

    try {
      this.reconnectAttempts++;
      const delay = Math.min(5000 * this.reconnectAttempts, 30000); // Exponential backoff, max 30s

      console.log(
        `[FIREHOSE] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));

      await this.stop();
      await this.start();
      console.log('[FIREHOSE] Reconnection successful');
    } catch (error) {
      console.error('[FIREHOSE] Reconnection failed:', error);
      // The next health check will trigger another reconnect attempt
    } finally {
      this.isReconnecting = false;
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
