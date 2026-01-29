import { EnvironmentConfigService } from '../shared/infrastructure/config/EnvironmentConfigService';
import { RepositoryFactory } from '../shared/infrastructure/http/factories/RepositoryFactory';
import { ServiceFactory } from '../shared/infrastructure/http/factories/ServiceFactory';
import { UseCaseFactory } from '../shared/infrastructure/http/factories/UseCaseFactory';
import { FirehoseWorkerProcess } from '../modules/atproto/infrastructure/processes/FirehoseWorkerProcess';
import { FirehoseEventHandler } from '../modules/atproto/application/handlers/FirehoseEventHandler';
import { ProcessFirehoseEventUseCase } from '../modules/atproto/application/useCases/ProcessFirehoseEventUseCase';
import { DrizzleFirehoseEventDuplicationService } from '../modules/atproto/infrastructure/services/DrizzleFirehoseEventDuplicationService';
import { DatabaseFactory } from '../shared/infrastructure/database/DatabaseFactory';

async function main() {
  console.log('[FIREHOSE] Starting firehose worker...');

  const configService = new EnvironmentConfigService();
  const repositories = RepositoryFactory.create(configService);
  const services = ServiceFactory.createForWorker(configService, repositories);
  const useCases = UseCaseFactory.createForWorker(repositories, services);

  // Get database connection for duplication service
  const db = DatabaseFactory.createConnection(
    configService.getDatabaseConfig(),
  );

  // Create firehose-specific services
  const duplicationService = new DrizzleFirehoseEventDuplicationService(
    db,
    repositories.atUriResolutionService,
    configService,
  );

  // Create main processing use case using the factory-created use cases
  const processFirehoseEventUseCase = new ProcessFirehoseEventUseCase(
    duplicationService,
    configService,
    useCases.processCardFirehoseEventUseCase,
    useCases.processCollectionFirehoseEventUseCase,
    useCases.processCollectionLinkFirehoseEventUseCase,
    useCases.processMarginBookmarkFirehoseEventUseCase,
    useCases.processMarginCollectionFirehoseEventUseCase,
    useCases.processMarginCollectionItemFirehoseEventUseCase,
  );

  const firehoseEventHandler = new FirehoseEventHandler(
    processFirehoseEventUseCase,
  );

  const firehoseWorker = new FirehoseWorkerProcess(
    configService,
    firehoseEventHandler,
  );

  await firehoseWorker.start();
}

main().catch((error) => {
  console.error('Failed to start firehose worker:', error);
  process.exit(1);
});
