import WebSocket from 'ws';
import { IFirehoseService } from '../../application/services/IFirehoseService';
import { FirehoseEventHandler } from '../../application/handlers/FirehoseEventHandler';
import {
  Environment,
  EnvironmentConfigService,
} from 'src/shared/infrastructure/config/EnvironmentConfigService';
import { FirehoseEvent } from '../../domain/FirehoseEvent';

const DEBUG_LOGGING = true; // Set to false to disable debug logs

interface JetstreamCommitEvent {
  did: string;
  time_us: number;
  kind: 'commit';
  commit: {
    rev: string;
    operation: 'create' | 'update' | 'delete';
    collection: string;
    rkey: string;
    record?: any;
    cid?: string;
  };
}

interface JetstreamIdentityEvent {
  did: string;
  time_us: number;
  kind: 'identity';
  identity: {
    did: string;
    handle: string;
    seq: number;
    time: string;
  };
}

interface JetstreamAccountEvent {
  did: string;
  time_us: number;
  kind: 'account';
  account: {
    active: boolean;
    did: string;
    seq: number;
    time: string;
  };
}

type JetstreamEvent =
  | JetstreamCommitEvent
  | JetstreamIdentityEvent
  | JetstreamAccountEvent;

export class AtProtoJetstreamService implements IFirehoseService {
  private ws?: WebSocket;
  private isRunningFlag = false;
  private cleaningUp = false;
  private eventCount = 0;
  private logInterval?: NodeJS.Timeout;
  private mostRecentEventTime?: Date;
  private reconnectTimeout?: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000; // 5 seconds

  constructor(
    private firehoseEventHandler: FirehoseEventHandler,
    private configService: EnvironmentConfigService,
  ) {}

  async start(): Promise<void> {
    if (this.isRunningFlag) {
      return;
    }

    try {
      console.log(
        `[JETSTREAM] Starting Jetstream service for collections: ${this.getFilteredCollections().join(', ')}`,
      );

      await this.connect();
      this.isRunningFlag = true;
      this.startEventCountLogging();
      console.log('[JETSTREAM] Jetstream service started');
    } catch (error) {
      console.error('[JETSTREAM] Failed to start Jetstream service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunningFlag) {
      return;
    }

    console.log('[JETSTREAM] Stopping Jetstream service...');

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }

    this.stopEventCountLogging();
    this.isRunningFlag = false;
    console.log('[JETSTREAM] Jetstream service stopped');
  }

  isRunning(): boolean {
    return (
      this.isRunningFlag && !!this.ws && this.ws.readyState === WebSocket.OPEN
    );
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const jetstreamUrl = this.buildJetstreamUrl();
      console.log(`[JETSTREAM] Connecting to ${jetstreamUrl}`);

      this.ws = new WebSocket(jetstreamUrl);

      this.ws.on('open', () => {
        console.log('[JETSTREAM] WebSocket connection established');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        console.log(
          `[JETSTREAM] WebSocket closed: ${code} ${reason.toString()}`,
        );
        if (this.isRunningFlag && !this.cleaningUp) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (error: Error) => {
        console.error('[JETSTREAM] WebSocket error:', error);
        if (this.reconnectAttempts === 0) {
          reject(error);
        }
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[JETSTREAM] Max reconnection attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    const delay =
      this.reconnectDelay *
      Math.pow(2, Math.min(this.reconnectAttempts - 1, 5)); // Exponential backoff, max 5

    console.log(
      `[JETSTREAM] Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`,
    );

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('[JETSTREAM] Reconnection failed:', error);
        this.scheduleReconnect();
      }
    }, delay);
  }

  private buildJetstreamUrl(): string {
    const baseUrl = this.configService.getAtProtoConfig().jetstreamWebsocket;
    const collections = this.getFilteredCollections();

    const params = new URLSearchParams();
    collections.forEach((collection) => {
      params.append('wantedCollections', collection);
    });

    return `${baseUrl}/subscribe?${params.toString()}`;
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString()) as JetstreamEvent;
      this.eventCount++;
      this.mostRecentEventTime = new Date(message.time_us / 1000); // Convert microseconds to milliseconds

      if (message.kind === 'commit') {
        this.handleCommitEvent(message);
      }
      // Ignore identity and account events
    } catch (error) {
      console.error('[JETSTREAM] Failed to parse message:', error);
    }
  }

  private async handleCommitEvent(event: JetstreamCommitEvent): Promise<void> {
    try {
      // Convert Jetstream event to our FirehoseEvent format
      const atUri = `at://${event.did}/${event.commit.collection}/${event.commit.rkey}`;

      if (DEBUG_LOGGING) {
        console.log(
          `[JETSTREAM] Processing commit event: ${event.commit.operation} for ${event.did}`,
        );
      }

      // Create a synthetic Event object that matches the ATProto firehose format
      const syntheticEvent = {
        event: event.commit.operation,
        did: event.did,
        uri: atUri,
        cid: event.commit.cid || null,
        record: event.commit.record,
        seq: Math.floor(event.time_us / 1000), // Use timestamp as seq
        time: new Date(event.time_us / 1000).toISOString(),
        rev: event.commit.rev,
        collection: event.commit.collection,
      };

      // Create FirehoseEvent from the synthetic event
      const firehoseEventResult = FirehoseEvent.fromEvent(
        syntheticEvent as any,
      );
      if (firehoseEventResult.isErr()) {
        if (!firehoseEventResult.error.message.includes('is not processable')) {
          console.error(
            '[JETSTREAM] Failed to create FirehoseEvent:',
            firehoseEventResult.error,
          );
        }
        return;
      }

      const result = await this.firehoseEventHandler.handle(
        firehoseEventResult.value,
      );

      if (result.isErr()) {
        console.error(
          '[JETSTREAM] Failed to process Jetstream event:',
          result.error,
        );
      } else if (DEBUG_LOGGING) {
        console.log(`[JETSTREAM] Successfully processed event`);
      }
    } catch (error) {
      console.error('[JETSTREAM] Unhandled error in handleCommitEvent:', error);
    }
  }

  private getFilteredCollections(): string[] {
    const collections = this.configService.getAtProtoCollections();
    const envConfig = new EnvironmentConfigService();

    // skip margin records in prod env for now
    if (envConfig.get().environment === Environment.PROD) {
      return [
        collections.card,
        collections.collection,
        collections.collectionLink,
      ];
    }
    return [
      collections.card,
      collections.collection,
      collections.collectionLink,
      collections.marginBookmark,
      collections.marginCollection,
      collections.marginCollectionItem,
    ];
  }

  private startEventCountLogging(): void {
    this.logInterval = setInterval(
      () => {
        const now = new Date();
        let timingInfo = '';

        if (this.mostRecentEventTime) {
          const gapSeconds = Math.floor(
            (now.getTime() - this.mostRecentEventTime.getTime()) / 1000,
          );
          timingInfo = ` | Most recent event: ${this.mostRecentEventTime.toISOString()} | Gap: ${gapSeconds}s`;
        }

        console.log(
          `[JETSTREAM] Events processed in last 10 minutes: ${this.eventCount}${timingInfo}`,
        );
        this.eventCount = 0; // Reset counter
      },
      10 * 60 * 1000,
    ); // 10 minute intervals
  }

  private stopEventCountLogging(): void {
    if (this.logInterval) {
      clearInterval(this.logInterval);
      this.logInterval = undefined;
    }
  }
}
