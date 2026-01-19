import { EnvironmentConfigService } from '../config/EnvironmentConfigService';
import {
  ServiceFactory,
  WorkerServices,
} from '../http/factories/ServiceFactory';
import { UseCaseFactory } from '../http/factories/UseCaseFactory';
import { CardAddedToLibraryEventHandler } from '../../../modules/notifications/application/eventHandlers/CardAddedToLibraryEventHandler';
import { CardAddedToCollectionEventHandler } from '../../../modules/notifications/application/eventHandlers/CardAddedToCollectionEventHandler';
import { CardRemovedFromLibraryEventHandler } from '../../../modules/notifications/application/eventHandlers/CardRemovedFromLibraryEventHandler';
import { CardNotificationSaga } from '../../../modules/notifications/application/sagas/CardNotificationSaga';
import { QueueNames } from '../events/QueueConfig';
import { EventNames } from '../events/EventConfig';
import { BaseWorkerProcess } from './BaseWorkerProcess';
import { IEventSubscriber } from '../../application/events/IEventSubscriber';
import { Repositories } from '../http/factories/RepositoryFactory';

export class NotificationWorkerProcess extends BaseWorkerProcess {
  constructor(configService: EnvironmentConfigService) {
    super(configService, QueueNames.NOTIFICATIONS);
  }

  protected createServices(repositories: Repositories): WorkerServices {
    return ServiceFactory.createForWorker(this.configService, repositories);
  }

  protected async validateDependencies(
    services: WorkerServices,
  ): Promise<void> {
    if (!services.redisConnection) {
      throw new Error('Redis connection required for notification worker');
    }
    await services.redisConnection.ping();
  }

  protected async registerHandlers(
    subscriber: IEventSubscriber,
    services: WorkerServices,
    repositories: Repositories,
  ): Promise<void> {
    const useCases = UseCaseFactory.createForWorker(repositories, services);

    // Create saga with proper use case dependency and state store from services
    const cardNotificationSaga = new CardNotificationSaga(
      useCases.createNotificationUseCase,
      services.sagaStateStore,
      repositories.cardRepository,
    );

    const cardAddedToLibraryHandler = new CardAddedToLibraryEventHandler(
      cardNotificationSaga,
    );
    const cardAddedToCollectionHandler = new CardAddedToCollectionEventHandler(
      cardNotificationSaga,
    );
    const cardRemovedFromLibraryHandler = new CardRemovedFromLibraryEventHandler(
      repositories.notificationRepository,
    );

    await subscriber.subscribe(
      EventNames.CARD_ADDED_TO_LIBRARY,
      cardAddedToLibraryHandler,
    );

    await subscriber.subscribe(
      EventNames.CARD_ADDED_TO_COLLECTION,
      cardAddedToCollectionHandler,
    );

    await subscriber.subscribe(
      EventNames.CARD_REMOVED_FROM_LIBRARY,
      cardRemovedFromLibraryHandler,
    );
  }
}
