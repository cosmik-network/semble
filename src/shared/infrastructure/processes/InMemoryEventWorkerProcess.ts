import { EnvironmentConfigService } from '../config/EnvironmentConfigService';
import {
  ServiceFactory,
  WorkerServices,
} from '../http/factories/ServiceFactory';
import { UseCaseFactory } from '../http/factories/UseCaseFactory';
import { CardAddedToLibraryEventHandler as FeedCardAddedToLibraryEventHandler } from '../../../modules/feeds/application/eventHandlers/CardAddedToLibraryEventHandler';
import { CardAddedToLibraryEventHandler as SearchCardAddedToLibraryEventHandler } from '../../../modules/search/application/eventHandlers/CardAddedToLibraryEventHandler';
import { CardAddedToLibraryEventHandler as NotificationCardAddedToLibraryEventHandler } from '../../../modules/notifications/application/eventHandlers/CardAddedToLibraryEventHandler';
import { CardAddedToCollectionEventHandler } from '../../../modules/feeds/application/eventHandlers/CardAddedToCollectionEventHandler';
import { CardAddedToCollectionEventHandler as NotificationCardAddedToCollectionEventHandler } from '../../../modules/notifications/application/eventHandlers/CardAddedToCollectionEventHandler';
import { CollectionContributionEventHandler } from '../../../modules/notifications/application/eventHandlers/CollectionContributionEventHandler';
import { CollectionContributionCleanupEventHandler } from '../../../modules/notifications/application/eventHandlers/CollectionContributionCleanupEventHandler';
import { UserFollowedTargetEventHandler } from '../../../modules/notifications/application/eventHandlers/UserFollowedTargetEventHandler';
import { UserUnfollowedTargetEventHandler } from '../../../modules/notifications/application/eventHandlers/UserUnfollowedTargetEventHandler';
import { CardNotificationSaga } from '../../../modules/notifications/application/sagas/CardNotificationSaga';
import { EventNames } from '../events/EventConfig';
import { IProcess } from '../../domain/IProcess';
import { IEventSubscriber } from '../../application/events/IEventSubscriber';
import {
  RepositoryFactory,
  Repositories,
} from '../http/factories/RepositoryFactory';

export class InMemoryEventWorkerProcess implements IProcess {
  constructor(private configService: EnvironmentConfigService) {}

  async start(): Promise<void> {
    console.log('Starting in-memory event worker...');

    const repositories = RepositoryFactory.create(this.configService);
    const services = ServiceFactory.createForWorker(
      this.configService,
      repositories,
    );

    const eventSubscriber = services.createEventSubscriber('feeds'); // Queue name doesn't matter for in-memory
    await this.registerHandlers(eventSubscriber, services, repositories);
    await eventSubscriber.start();

    console.log('In-memory event worker started');
  }

  private async registerHandlers(
    subscriber: IEventSubscriber,
    services: WorkerServices,
    repositories: Repositories,
  ): Promise<void> {
    const useCases = UseCaseFactory.createForWorker(repositories, services);

    // Feed handlers - call use case directly (no saga intermediary)
    const feedCardAddedToLibraryHandler =
      new FeedCardAddedToLibraryEventHandler(useCases.addActivityToFeedUseCase);
    const cardAddedToCollectionHandler = new CardAddedToCollectionEventHandler(
      useCases.addActivityToFeedUseCase,
    );

    // Search handlers
    const searchCardAddedToLibraryHandler =
      new SearchCardAddedToLibraryEventHandler(
        useCases.indexUrlForSearchUseCase,
        repositories.cardRepository,
      );

    // Notification handlers
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

    const notificationCardAddedToLibraryHandler =
      new NotificationCardAddedToLibraryEventHandler(cardNotificationSaga);
    const notificationCardAddedToCollectionHandler =
      new NotificationCardAddedToCollectionEventHandler(cardNotificationSaga);

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

    // Follow notification handlers (direct, no saga)
    const userFollowedTargetHandler = new UserFollowedTargetEventHandler(
      services.notificationService,
      repositories.userRepository,
      repositories.collectionRepository,
    );
    const userUnfollowedTargetHandler = new UserUnfollowedTargetEventHandler(
      repositories.notificationRepository,
    );

    // Register feed handlers
    await subscriber.subscribe(
      EventNames.CARD_ADDED_TO_LIBRARY,
      feedCardAddedToLibraryHandler,
    );

    await subscriber.subscribe(
      EventNames.CARD_ADDED_TO_COLLECTION,
      cardAddedToCollectionHandler,
    );

    // Register search handlers
    await subscriber.subscribe(
      EventNames.CARD_ADDED_TO_LIBRARY,
      searchCardAddedToLibraryHandler,
    );

    // Register notification handlers
    await subscriber.subscribe(
      EventNames.CARD_ADDED_TO_LIBRARY,
      notificationCardAddedToLibraryHandler,
    );

    await subscriber.subscribe(
      EventNames.CARD_ADDED_TO_COLLECTION,
      notificationCardAddedToCollectionHandler,
    );

    // Collection contribution handler also subscribes to CARD_ADDED_TO_COLLECTION
    // Both handlers will process the event independently
    await subscriber.subscribe(
      EventNames.CARD_ADDED_TO_COLLECTION,
      collectionContributionHandler,
    );

    await subscriber.subscribe(
      EventNames.CARD_REMOVED_FROM_COLLECTION,
      collectionContributionCleanupHandler,
    );

    // Register follow notification handlers
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
