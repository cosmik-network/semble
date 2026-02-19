import { EnvironmentConfigService } from '../config/EnvironmentConfigService';
import {
  ServiceFactory,
  WorkerServices,
} from '../http/factories/ServiceFactory';
import { UseCaseFactory } from '../http/factories/UseCaseFactory';
import { CardAddedToLibraryEventHandler } from '../../../modules/notifications/application/eventHandlers/CardAddedToLibraryEventHandler';
import { CardAddedToCollectionEventHandler } from '../../../modules/notifications/application/eventHandlers/CardAddedToCollectionEventHandler';
import { CardRemovedFromLibraryEventHandler } from '../../../modules/notifications/application/eventHandlers/CardRemovedFromLibraryEventHandler';
import { CollectionContributionEventHandler } from '../../../modules/notifications/application/eventHandlers/CollectionContributionEventHandler';
import { CollectionContributionCleanupEventHandler } from '../../../modules/notifications/application/eventHandlers/CollectionContributionCleanupEventHandler';
import { UserFollowedTargetEventHandler } from '../../../modules/notifications/application/eventHandlers/UserFollowedTargetEventHandler';
import { UserUnfollowedTargetEventHandler } from '../../../modules/notifications/application/eventHandlers/UserUnfollowedTargetEventHandler';
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
      repositories.notificationRepository,
      repositories.userRepository,
      services.identityResolutionService,
      repositories.collectionRepository,
      repositories.atUriResolutionService,
      this.configService,
    );

    const cardAddedToLibraryHandler = new CardAddedToLibraryEventHandler(
      cardNotificationSaga,
    );
    const cardAddedToCollectionHandler = new CardAddedToCollectionEventHandler(
      cardNotificationSaga,
    );
    const cardRemovedFromLibraryHandler =
      new CardRemovedFromLibraryEventHandler(cardNotificationSaga);

    // Collection contribution notification handlers (direct, no saga)
    const collectionContributionHandler =
      new CollectionContributionEventHandler(
        useCases.createNotificationUseCase,
        repositories.collectionRepository,
      );
    const collectionContributionCleanupHandler =
      new CollectionContributionCleanupEventHandler(
        repositories.notificationRepository,
        repositories.collectionRepository,
      );

    // Follow notification handlers
    const userFollowedTargetHandler = new UserFollowedTargetEventHandler(
      services.notificationService,
      repositories.userRepository,
      repositories.collectionRepository,
    );
    const userUnfollowedTargetHandler = new UserUnfollowedTargetEventHandler(
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

    // Collection contribution handler also subscribes to CARD_ADDED_TO_COLLECTION
    // Both handlers will process the event independently
    await subscriber.subscribe(
      EventNames.CARD_ADDED_TO_COLLECTION,
      collectionContributionHandler,
    );

    await subscriber.subscribe(
      EventNames.CARD_REMOVED_FROM_LIBRARY,
      cardRemovedFromLibraryHandler,
    );

    await subscriber.subscribe(
      EventNames.CARD_REMOVED_FROM_COLLECTION,
      collectionContributionCleanupHandler,
    );

    await subscriber.subscribe(
      EventNames.USER_FOLLOWED_TARGET,
      userFollowedTargetHandler,
    );

    await subscriber.subscribe(
      EventNames.USER_UNFOLLOWED_TARGET,
      userUnfollowedTargetHandler,
    );
  }
}
