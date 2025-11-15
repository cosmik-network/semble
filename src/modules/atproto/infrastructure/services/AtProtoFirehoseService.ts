import { Firehose, MemoryRunner, Event, CommitEvt } from '@atproto/sync';
import { IFirehoseService } from '../../application/services/IFirehoseService';
import { FirehoseEventHandler } from '../../application/handlers/FirehoseEventHandler';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';
import { IdResolver } from '@atproto/identity';

export class AtProtoFirehoseService implements IFirehoseService {
  private firehose?: Firehose;
  private runner?: MemoryRunner;
  private isRunningFlag = false;

  constructor(
    private firehoseEventHandler: FirehoseEventHandler,
    private configService: EnvironmentConfigService,
    private idResolver: IdResolver,
  ) {}

  async start(): Promise<void> {
    if (this.isRunningFlag) {
      return;
    }

    console.log('Starting AT Protocol firehose service...');

    const runner = new MemoryRunner({});
    this.runner = runner;

    this.firehose = new Firehose({
      service: this.configService.getAtProtoConfig().firehoseWebsocket,
      runner,
      idResolver: this.idResolver,
      filterCollections: this.getFilteredCollections(),
      handleEvent: this.handleFirehoseEvent.bind(this),
      onError: this.handleError.bind(this),
    });

    await this.firehose.start();
    this.isRunningFlag = true;
    console.log('AT Protocol firehose service started');
  }

  async stop(): Promise<void> {
    if (!this.isRunningFlag) {
      return;
    }

    console.log('Stopping AT Protocol firehose service...');

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
    return this.isRunningFlag;
  }

  private async handleFirehoseEvent(evt: Event): Promise<void> {
    // Only process commit events (create, update, delete)
    if (
      evt.event !== 'create' &&
      evt.event !== 'update' &&
      evt.event !== 'delete'
    ) {
      return;
    }

    const commitEvt = evt as CommitEvt;

    const result = await this.firehoseEventHandler.handle({
      uri: commitEvt.uri.toString(),
      cid: commitEvt.event === 'delete' ? null : commitEvt.cid.toString(),
      eventType: commitEvt.event,
      record: commitEvt.event === 'delete' ? undefined : commitEvt.record,
      did: commitEvt.did,
      collection: commitEvt.collection,
    });

    if (result.isErr()) {
      console.error('Failed to process firehose event:', result.error);
    }
  }

  private handleError(err: Error): void {
    console.error('Firehose error:', err);
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
