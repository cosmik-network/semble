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
        `Starting AT Protocol firehose service for collections: ${this.getFilteredCollections().join(', ')}`,
      );

      const runner = new MemoryRunner({});
      this.runner = runner;

      this.firehose = new Firehose({
        service: this.configService.getAtProtoConfig().firehoseWebsocket,
        runner,
        idResolver: this.idResolver,
        filterCollections: this.getFilteredCollections(),
        excludeIdentity: true,
        excludeAccount: true,
        excludeSync: true,
        subscriptionReconnectDelay: 5000, // 5 second delay between reconnects
        handleEvent: this.handleFirehoseEvent.bind(this),
        onError: this.handleError.bind(this),
      });

      await this.firehose.start();
      this.isRunningFlag = true;
      this.reconnectAttempts = 0; // Reset on successful start
      this.startConnectionMonitoring();
      console.log('AT Protocol firehose service started');
    } catch (error) {
      console.error('Failed to start firehose:', error);
      await this.reconnect();
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunningFlag) {
      return;
    }

    console.log('Stopping AT Protocol firehose service...');

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
    console.log('AT Protocol firehose service stopped');
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
        `[HEALTH] Connected: ${isConnected}, Last event: ${
          this.lastEventTime
            ? `${Math.round(timeSinceLastEvent! / 1000)}s ago`
            : 'never'
        }, Reconnect attempts: ${this.reconnectAttempts}`,
      );

      // Check if connection appears dead
      if (!isConnected) {
        console.warn('[HEALTH] Connection appears dead, attempting reconnect');
        this.reconnect();
        return;
      }

      // Check if we haven't received events for too long (10 minutes)
      // Note: AT Protocol firehose should have regular activity
      if (this.lastEventTime && timeSinceLastEvent! > 600000) {
        console.warn('[HEALTH] No events for 10 minutes, forcing reconnect');
        this.reconnect();
        return;
      }

      // Check if aborted but still marked as running
      if ((this.firehose as any)?.abortController?.signal?.aborted) {
        console.warn(
          '[HEALTH] Connection aborted but still marked running, reconnecting',
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
        console.log(`Processing firehose event: ${evt.event} for ${evt.did}`);
      }

      // Create FirehoseEvent value object (includes filtering logic)
      const firehoseEventResult = FirehoseEvent.fromEvent(evt);
      if (firehoseEventResult.isErr()) {
        // Only log actual errors, not filtered events
        if (!firehoseEventResult.error.message.includes('is not processable')) {
          console.error(
            'Failed to create FirehoseEvent:',
            firehoseEventResult.error,
          );
        }
        return;
      }

      if (DEBUG_LOGGING) {
        console.log(`Successfully created FirehoseEvent, passing to handler`);
      }

      const result = await this.firehoseEventHandler.handle(
        firehoseEventResult.value,
      );

      if (result.isErr()) {
        console.error('Failed to process firehose event:', result.error);
      } else if (DEBUG_LOGGING) {
        console.log(`Successfully processed event`);
      }
    } catch (error) {
      console.error('Unhandled error in handleFirehoseEvent:', error);
      // Don't re-throw - let processing continue
    }
  }

  private handleError(err: Error): void {
    console.error('Firehose error:', err.name, err.message);

    // Log different error types for debugging
    if (err.name === 'FirehoseParseError') {
      console.warn('Parse error - continuing without reconnect');
      return;
    }

    if (err.name === 'FirehoseValidationError') {
      console.warn('Validation error - continuing without reconnect');
      return;
    }

    // For subscription errors and others, attempt reconnect
    console.log('Connection error detected, will attempt reconnect');
    if (this.isRunningFlag) {
      this.reconnect();
    }
  }

  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `Max reconnect attempts (${this.maxReconnectAttempts}) reached. Stopping service.`,
      );
      await this.stop();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(5000 * this.reconnectAttempts, 30000); // Exponential backoff, max 30s

    console.log(
      `Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`,
    );

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.stop();
      await this.start();
      console.log('Reconnection successful');
    } catch (error) {
      console.error('Reconnection failed:', error);
      // The next health check will trigger another reconnect attempt
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
