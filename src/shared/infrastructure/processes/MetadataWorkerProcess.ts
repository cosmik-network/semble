import { EnvironmentConfigService } from '../config/EnvironmentConfigService';
import {
  ServiceFactory,
  WorkerServices,
} from '../http/factories/ServiceFactory';
import { UseCaseFactory } from '../http/factories/UseCaseFactory';
import { CardAddedToLibraryEventHandler } from '../../../modules/cards/application/eventHandlers/CardAddedToLibraryEventHandler';
import { ConnectionCreatedEventHandler } from '../../../modules/cards/application/eventHandlers/ConnectionCreatedEventHandler';
import { QueueNames } from '../events/QueueConfig';
import { EventNames } from '../events/EventConfig';
import { BaseWorkerProcess } from './BaseWorkerProcess';
import { IEventSubscriber } from '../../application/events/IEventSubscriber';
import { Repositories } from '../http/factories/RepositoryFactory';

/**
 * Enriches URL cards asynchronously: cards are created with fast metadata,
 * this worker fetches the full (slow) metadata and updates the card + PDS
 * record when the result is an improvement.
 *
 * Note: unlike the firehose worker this worker deliberately keeps PDS
 * publishing enabled — republishing the enriched record is its job.
 */
export class MetadataWorkerProcess extends BaseWorkerProcess {
  constructor(configService: EnvironmentConfigService) {
    super(configService, QueueNames.METADATA);
  }

  protected createServices(repositories: Repositories): WorkerServices {
    return ServiceFactory.createForWorker(this.configService, repositories);
  }

  protected async validateDependencies(
    services: WorkerServices,
  ): Promise<void> {
    if (!services.redisConnection) {
      throw new Error('Redis connection required for metadata worker');
    }
    await services.redisConnection.ping();
  }

  protected async registerHandlers(
    subscriber: IEventSubscriber,
    services: WorkerServices,
    repositories: Repositories,
  ): Promise<void> {
    const useCases = UseCaseFactory.createForWorker(repositories, services);

    const cardAddedToLibraryHandler = new CardAddedToLibraryEventHandler(
      repositories.cardRepository,
      services.metadataService,
      useCases.updateUrlCardMetadataUseCase,
    );

    await subscriber.subscribe(
      EventNames.CARD_ADDED_TO_LIBRARY,
      cardAddedToLibraryHandler,
    );

    const connectionCreatedHandler = new ConnectionCreatedEventHandler(
      repositories.connectionRepository,
      services.metadataService,
      useCases.updateConnectionUrlMetadataUseCase,
    );

    await subscriber.subscribe(
      EventNames.CONNECTION_CREATED,
      connectionCreatedHandler,
    );
  }
}
