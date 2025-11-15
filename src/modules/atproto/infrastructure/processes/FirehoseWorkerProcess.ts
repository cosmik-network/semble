import { IProcess } from 'src/shared/domain/IProcess';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';
import { FirehoseEventHandler } from '../../application/handlers/FirehoseEventHandler';
import { AtProtoFirehoseService } from '../services/AtProtoFirehoseService';
import { IdResolver } from '@atproto/identity';

export class FirehoseWorkerProcess implements IProcess {
  private firehoseService?: AtProtoFirehoseService;

  constructor(
    private configService: EnvironmentConfigService,
    private firehoseEventHandler: FirehoseEventHandler,
  ) {}

  async start(): Promise<void> {
    console.log('Starting firehose worker...');

    const idResolver = new IdResolver();

    this.firehoseService = new AtProtoFirehoseService(
      this.firehoseEventHandler,
      this.configService,
      idResolver,
    );

    await this.firehoseService.start();
    console.log('Firehose worker started');

    this.setupShutdownHandlers();
  }

  private setupShutdownHandlers(): void {
    const shutdown = async () => {
      console.log('Shutting down firehose worker...');
      if (this.firehoseService) {
        await this.firehoseService.stop();
      }
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}
