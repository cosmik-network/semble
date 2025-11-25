import { Firehose, MemoryRunner, Event } from '@atproto/sync';
import { IFirehoseService } from '../../application/services/IFirehoseService';
import { FirehoseEventHandler } from '../../application/handlers/FirehoseEventHandler';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';
import { IdResolver } from '@atproto/identity';
import {
  FIREHOSE_COLLECTIONS,
  FirehoseEvent,
} from '../../domain/FirehoseEvent';

const DEBUG_LOGGING = true; // Set to false to disable debug logs

export class AtProtoFirehoseService implements IFirehoseService {
  private firehose?: Firehose;
  private runner?: MemoryRunner;
  private isRunningFlag = false;
  private cleaningUp = false;

  constructor(
    private firehoseEventHandler: FirehoseEventHandler,
    private configService: EnvironmentConfigService,
    private idResolver: IdResolver,
  ) {
    this.setupCleanupHandlers();
  }

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
        runner,
        idResolver: this.idResolver,
        excludeIdentity: true,
        excludeAccount: true,
        subscriptionReconnectDelay: 5000, // 5 second delay between reconnects
        handleEvent: this.handleFirehoseEvent.bind(this),
        onError: this.handleError.bind(this),
      });

      // Don't await - this is a long-running operation
      this.firehose.start().catch((error: any) => {
        console.error('[FIREHOSE] Firehose start failed:', error);
      });

      this.isRunningFlag = true;
      console.log('[FIREHOSE] AT Protocol firehose service started');
    } catch (error) {
      console.error('[FIREHOSE] Failed to start firehose:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunningFlag) {
      return;
    }

    console.log('[FIREHOSE] Stopping AT Protocol firehose service...');

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
    return this.isRunningFlag && !!this.firehose;
  }

  private async handleFirehoseEvent(evt: Event): Promise<void> {
    try {
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
      if (
        firehoseEventResult.value.collection ===
        FIREHOSE_COLLECTIONS.APP_BSKY_POST
      ) {
        return;
      }
      if (DEBUG_LOGGING) {
        console.log(
          `[FIREHOSE] Processing firehose event: ${evt.event} for ${evt.did}`,
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
  }

  private getFilteredCollections(): string[] {
    const collections = this.configService.getAtProtoCollections();
    return [
      collections.card,
      collections.collection,
      collections.collectionLink,
      FIREHOSE_COLLECTIONS.APP_BSKY_POST,
    ];
  }

  private setupCleanupHandlers(): void {
    const cleanup = async () => {
      if (this.cleaningUp) return;
      this.cleaningUp = true;
      console.log('[FIREHOSE] Shutting down firehose...');

      if (this.firehose) {
        await this.firehose.destroy();
      }

      if (this.runner) {
        await this.runner.destroy();
      }

      process.exit();
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGUSR2', cleanup); // For nodemon
  }
}
