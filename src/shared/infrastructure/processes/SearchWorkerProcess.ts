import { EnvironmentConfigService } from '../config/EnvironmentConfigService';
import {
  ServiceFactory,
  WorkerServices,
} from '../http/factories/ServiceFactory';
import { UseCaseFactory } from '../http/factories/UseCaseFactory';
import { CardAddedToLibraryEventHandler } from '../../../modules/search/application/eventHandlers/CardAddedToLibraryEventHandler';
import { ConnectionCreatedEventHandler } from '../../../modules/search/application/eventHandlers/ConnectionCreatedEventHandler';
import { QueueNames } from '../events/QueueConfig';
import { EventNames } from '../events/EventConfig';
import { BaseWorkerProcess } from './BaseWorkerProcess';
import { IEventSubscriber } from '../../application/events/IEventSubscriber';
import { Repositories } from '../http/factories/RepositoryFactory';

export class SearchWorkerProcess extends BaseWorkerProcess {
  constructor(configService: EnvironmentConfigService) {
    super(configService, QueueNames.SEARCH);
  }

  protected createServices(repositories: Repositories): WorkerServices {
    return ServiceFactory.createForWorker(this.configService, repositories);
  }

  protected async validateDependencies(
    services: WorkerServices,
  ): Promise<void> {
    if (!services.redisConnection) {
      throw new Error('Redis connection required for search worker');
    }
    await services.redisConnection.ping();

    // Validate search service (which includes vector database health check)
    const searchHealthResult = await services.searchService.healthCheck();
    if (searchHealthResult.isErr() || !searchHealthResult.value) {
      throw new Error('Search service connection required for search worker');
    }
  }

  protected async registerHandlers(
    subscriber: IEventSubscriber,
    services: WorkerServices,
    repositories: Repositories,
  ): Promise<void> {
    const useCases = UseCaseFactory.createForWorker(repositories, services);

    const cardAddedToLibraryHandler = new CardAddedToLibraryEventHandler(
      useCases.indexUrlForSearchUseCase,
      repositories.cardRepository,
    );

    await subscriber.subscribe(
      EventNames.CARD_ADDED_TO_LIBRARY,
      cardAddedToLibraryHandler,
    );

    const connectionCreatedHandler = new ConnectionCreatedEventHandler(
      useCases.indexUrlForSearchUseCase,
      repositories.connectionRepository,
    );

    await subscriber.subscribe(
      EventNames.CONNECTION_CREATED,
      connectionCreatedHandler,
    );
  }
}
