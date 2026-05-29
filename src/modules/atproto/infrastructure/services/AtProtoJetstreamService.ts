import WebSocket from 'ws';
import { IFirehoseService } from '../../application/services/IFirehoseService';
import { IFirehoseCursorRepository } from '../../application/services/IFirehoseCursorRepository';
import { FirehoseEventHandler } from '../../application/handlers/FirehoseEventHandler';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';
import { FirehoseEvent } from '../../domain/FirehoseEvent';

const DEBUG_LOGGING = true; // Set to false to disable debug logs

// Rewind the cursor a few seconds on (re)connect for gapless playback; the
// uri+cid dedup in DrizzleFirehoseEventDuplicationService absorbs the overlap.
const CURSOR_REWIND_US = 5_000_000; // 5 seconds in microseconds
const CURSOR_SAVE_INTERVAL_MS = 60_000; // persist cursor every 60s
const STALL_CHECK_INTERVAL_MS = 5 * 60_000; // check for stalls every 5 minutes
const STALL_THRESHOLD_MS = 60 * 60_000; // no events for 1 hour => treat as dead

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
  private cursorSaveInterval?: NodeJS.Timeout;
  private stallCheckInterval?: NodeJS.Timeout;
  private mostRecentEventTime?: Date;
  private lastTimeUs?: number;
  private lastSavedTimeUs?: number;
  private reconnectTimeout?: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000; // 5 seconds
  private hosts: string[] = [];
  private hostIndex = 0;

  constructor(
    private firehoseEventHandler: FirehoseEventHandler,
    private configService: EnvironmentConfigService,
    private cursorRepository: IFirehoseCursorRepository,
  ) {}

  async start(): Promise<void> {
    if (this.isRunningFlag) {
      return;
    }

    try {
      this.hosts = this.parseHosts();
      this.hostIndex = 0;

      console.log(
        `[JETSTREAM] Starting Jetstream service for collections: ${this.getFilteredCollections().join(', ')}`,
      );
      console.log(
        `[JETSTREAM] Configured hosts (in rotation order): ${this.hosts.join(', ')}`,
      );

      await this.loadCursor();
      await this.connect();
      this.isRunningFlag = true;
      this.startEventCountLogging();
      this.startCursorSaving();
      this.startStallWatchdog();
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
    this.cleaningUp = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }

    this.stopEventCountLogging();
    this.stopCursorSaving();
    this.stopStallWatchdog();
    await this.persistCursor();
    this.isRunningFlag = false;
    this.cleaningUp = false;
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
        // NOTE: reconnectAttempts is intentionally NOT reset here. A flapping
        // connection (open -> close 1006 with no events) would otherwise reset
        // the counter forever and never trip the max-attempts cap. We reset
        // only once we actually receive an event (see handleMessage).
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
      console.error(
        '[JETSTREAM] Max reconnection attempts reached, exiting for restart',
      );
      void this.exitForRestart();
      return;
    }

    this.reconnectAttempts++;
    // Rotate to the next configured host so a single overloaded/down jetstream
    // instance can't permanently block us. Cursors are time-based and portable
    // across instances per the Jetstream docs.
    if (this.hosts.length > 1) {
      this.hostIndex = (this.hostIndex + 1) % this.hosts.length;
    }
    const delay =
      this.reconnectDelay *
      Math.pow(2, Math.min(this.reconnectAttempts - 1, 5)); // Exponential backoff, max 5

    console.log(
      `[JETSTREAM] Scheduling reconnect attempt ${this.reconnectAttempts} to ${this.hosts[this.hostIndex]} in ${delay}ms`,
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

  private parseHosts(): string[] {
    const raw = this.configService.getAtProtoConfig().jetstreamWebsocket;
    const hosts = raw
      .split(',')
      .map((h) => h.trim().replace(/\/+$/, ''))
      .filter((h) => h.length > 0);
    if (hosts.length === 0) {
      throw new Error(
        '[JETSTREAM] No jetstream hosts configured (ATPROTO_JETSTREAM_WEBSOCKET is empty)',
      );
    }
    return hosts;
  }

  private buildJetstreamUrl(): string {
    const baseUrl = this.hosts[this.hostIndex]!;
    const collections = this.getFilteredCollections();

    const params = new URLSearchParams();
    collections.forEach((collection) => {
      params.append('wantedCollections', collection);
    });

    if (this.lastTimeUs !== undefined) {
      const cursor = Math.max(0, this.lastTimeUs - CURSOR_REWIND_US);
      params.append('cursor', cursor.toString());
      console.log(`[JETSTREAM] Resuming from cursor ${cursor}`);
    }

    return `${baseUrl}/subscribe?${params.toString()}`;
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString()) as JetstreamEvent;
      this.eventCount++;
      this.lastTimeUs = message.time_us;
      this.mostRecentEventTime = new Date(message.time_us / 1000); // Convert microseconds to milliseconds
      // Connection is genuinely healthy once we've received an event — only
      // now is it safe to reset the reconnect counter.
      this.reconnectAttempts = 0;

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

    return [
      collections.card,
      collections.collection,
      collections.collectionLink,
      collections.marginNote,
      collections.marginBookmark,
      collections.marginCollection,
      collections.marginCollectionItem,
      collections.collectionLinkRemoval,
      collections.follow,
      collections.connection,
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

  private async loadCursor(): Promise<void> {
    const result = await this.cursorRepository.getCursor();
    if (result.isErr()) {
      console.error(
        '[JETSTREAM] Failed to load cursor, starting from live-tail:',
        result.error,
      );
      return;
    }

    if (result.value !== null) {
      this.lastTimeUs = result.value;
      console.log(`[JETSTREAM] Loaded saved cursor ${result.value}`);
    } else {
      console.log('[JETSTREAM] No saved cursor, starting from live-tail');
    }
  }

  private async persistCursor(): Promise<void> {
    if (
      this.lastTimeUs === undefined ||
      this.lastTimeUs === this.lastSavedTimeUs
    ) {
      return;
    }

    const timeUs = this.lastTimeUs;
    const result = await this.cursorRepository.saveCursor(timeUs);
    if (result.isErr()) {
      console.error('[JETSTREAM] Failed to save cursor:', result.error);
      return;
    }

    this.lastSavedTimeUs = timeUs;
  }

  private startCursorSaving(): void {
    this.cursorSaveInterval = setInterval(() => {
      void this.persistCursor();
    }, CURSOR_SAVE_INTERVAL_MS);
  }

  private stopCursorSaving(): void {
    if (this.cursorSaveInterval) {
      clearInterval(this.cursorSaveInterval);
      this.cursorSaveInterval = undefined;
    }
  }

  private startStallWatchdog(): void {
    this.stallCheckInterval = setInterval(() => {
      if (!this.isRunningFlag || this.cleaningUp || !this.mostRecentEventTime) {
        return;
      }

      const gapMs = Date.now() - this.mostRecentEventTime.getTime();
      if (gapMs > STALL_THRESHOLD_MS) {
        console.error(
          `[JETSTREAM] No events for ${Math.floor(gapMs / 1000)}s, connection appears stalled, exiting for restart`,
        );
        void this.exitForRestart();
      }
    }, STALL_CHECK_INTERVAL_MS);
  }

  private stopStallWatchdog(): void {
    if (this.stallCheckInterval) {
      clearInterval(this.stallCheckInterval);
      this.stallCheckInterval = undefined;
    }
  }

  private async exitForRestart(): Promise<void> {
    await this.persistCursor();
    process.exit(1);
  }
}
