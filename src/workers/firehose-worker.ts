import { EnvironmentConfigService } from '../shared/infrastructure/config/EnvironmentConfigService';
import { RepositoryFactory } from '../shared/infrastructure/http/factories/RepositoryFactory';
import { ServiceFactory } from '../shared/infrastructure/http/factories/ServiceFactory';
import { FirehoseWorkerProcess } from '../modules/atproto/infrastructure/processes/FirehoseWorkerProcess';
import { FirehoseEventHandler } from '../modules/atproto/application/handlers/FirehoseEventHandler';
import { ProcessFirehoseEventUseCase } from '../modules/atproto/application/useCases/ProcessFirehoseEventUseCase';
import { ProcessCardFirehoseEventUseCase } from '../modules/atproto/application/useCases/ProcessCardFirehoseEventUseCase';
import { ProcessCollectionFirehoseEventUseCase } from '../modules/atproto/application/useCases/ProcessCollectionFirehoseEventUseCase';
import { ProcessCollectionLinkFirehoseEventUseCase } from '../modules/atproto/application/useCases/ProcessCollectionLinkFirehoseEventUseCase';
import { AddUrlToLibraryUseCase } from '../modules/cards/application/useCases/commands/AddUrlToLibraryUseCase';
import { UpdateUrlCardAssociationsUseCase } from '../modules/cards/application/useCases/commands/UpdateUrlCardAssociationsUseCase';
import { RemoveCardFromLibraryUseCase } from '../modules/cards/application/useCases/commands/RemoveCardFromLibraryUseCase';
import { CreateCollectionUseCase } from '../modules/cards/application/useCases/commands/CreateCollectionUseCase';
import { UpdateCollectionUseCase } from '../modules/cards/application/useCases/commands/UpdateCollectionUseCase';
import { DeleteCollectionUseCase } from '../modules/cards/application/useCases/commands/DeleteCollectionUseCase';
import { DrizzleFirehoseEventDuplicationService } from '../modules/atproto/infrastructure/services/DrizzleFirehoseEventDuplicationService';
import { DatabaseFactory } from '../shared/infrastructure/database/DatabaseFactory';

async function main() {
  console.log('Starting firehose worker...');

  const configService = new EnvironmentConfigService();
  const repositories = RepositoryFactory.create(configService);
  const services = ServiceFactory.createForWorker(configService, repositories);

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

  // Create use cases needed by firehose processors
  const addUrlToLibraryUseCase = new AddUrlToLibraryUseCase(
    repositories.cardRepository,
    services.metadataService,
    services.cardLibraryService,
    services.cardCollectionService,
    services.eventPublisher,
  );

  const updateUrlCardAssociationsUseCase = new UpdateUrlCardAssociationsUseCase(
    repositories.cardRepository,
    services.cardLibraryService,
    services.cardCollectionService,
    services.eventPublisher,
  );

  const removeCardFromLibraryUseCase = new RemoveCardFromLibraryUseCase(
    repositories.cardRepository,
    services.cardLibraryService,
  );

  const createCollectionUseCase = new CreateCollectionUseCase(
    repositories.collectionRepository,
    services.collectionPublisher,
  );

  const updateCollectionUseCase = new UpdateCollectionUseCase(
    repositories.collectionRepository,
    services.collectionPublisher,
  );

  const deleteCollectionUseCase = new DeleteCollectionUseCase(
    repositories.collectionRepository,
    services.collectionPublisher,
  );

  // Create specific event processing use cases
  const processCardFirehoseEventUseCase = new ProcessCardFirehoseEventUseCase(
    repositories.atUriResolutionService,
    addUrlToLibraryUseCase,
    updateUrlCardAssociationsUseCase,
    removeCardFromLibraryUseCase,
  );

  const processCollectionFirehoseEventUseCase =
    new ProcessCollectionFirehoseEventUseCase(
      repositories.atUriResolutionService,
      createCollectionUseCase,
      updateCollectionUseCase,
      deleteCollectionUseCase,
    );

  const processCollectionLinkFirehoseEventUseCase =
    new ProcessCollectionLinkFirehoseEventUseCase(
      repositories.atUriResolutionService,
      updateUrlCardAssociationsUseCase,
    );

  // Create main processing use case
  const processFirehoseEventUseCase = new ProcessFirehoseEventUseCase(
    duplicationService,
    configService,
    processCardFirehoseEventUseCase,
    processCollectionFirehoseEventUseCase,
    processCollectionLinkFirehoseEventUseCase,
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
