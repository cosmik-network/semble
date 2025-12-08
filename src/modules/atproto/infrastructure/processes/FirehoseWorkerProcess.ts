import { IProcess } from 'src/shared/domain/IProcess';
import { EnvironmentConfigService } from 'src/shared/infrastructure/config/EnvironmentConfigService';
import { FirehoseEventHandler } from '../../application/handlers/FirehoseEventHandler';
import { AtProtoJetstreamService } from '../services/AtProtoJetstreamService';

export class FirehoseWorkerProcess implements IProcess {
  private firehoseService?: AtProtoJetstreamService;

  constructor(
    private configService: EnvironmentConfigService,
    private firehoseEventHandler: FirehoseEventHandler,
  ) {}

  async start(): Promise<void> {
    console.log('[FIREHOSE] Starting firehose worker...');

    console.log('[FIREHOSE] Using Jetstream service');
    this.firehoseService = new AtProtoJetstreamService(
      this.firehoseEventHandler,
      this.configService,
    );

    // Don't await - let it run in background
    this.firehoseService.start().catch((error) => {
      console.error('[FIREHOSE] Firehose service failed:', error);
    });

    console.log('[FIREHOSE] Firehose worker started');
    this.setupShutdownHandlers();
  }

  private setupShutdownHandlers(): void {
    const shutdown = async () => {
      console.log('[FIREHOSE] Shutting down firehose worker...');
      if (this.firehoseService) {
        await this.firehoseService.stop();
      }
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}
