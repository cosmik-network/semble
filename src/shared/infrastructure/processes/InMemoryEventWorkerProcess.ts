import { EnvironmentConfigService } from '../config/EnvironmentConfigService';
import {
  ServiceFactory,
  WorkerServices,
} from '../http/factories/ServiceFactory';
import { UseCaseFactory } from '../http/factories/UseCaseFactory';
import { CardAddedToLibraryEventHandler as FeedCardAddedToLibraryEventHandler } from '../../../modules/feeds/application/eventHandlers/CardAddedToLibraryEventHandler';
import { CardAddedToLibraryEventHandler as SearchCardAddedToLibraryEventHandler } from '../../../modules/search/application/eventHandlers/CardAddedToLibraryEventHandler';
import { CardAddedToCollectionEventHandler } from '../../../modules/feeds/application/eventHandlers/CardAddedToCollectionEventHandler';
import { CardActivityBundlingSaga } from '../../../modules/notifications/application/sagas/CardActivityBundlingSaga';
import { CardActivityBufferingHandler } from '../../../modules/notifications/application/eventHandlers/CardActivityBufferingHandler';
import { CardLibraryRemovalCleanupHandler } from '../../../modules/notifications/application/eventHandlers/CardLibraryRemovalCleanupHandler';
import { CardCollectionRemovalCleanupHandler } from '../../../modules/notifications/application/eventHandlers/CardCollectionRemovalCleanupHandler';
import { ViaCardBundleHandler } from '../../../modules/notifications/application/bundleHandlers/ViaCardBundleHandler';
import { UrlMentionBundleHandler } from '../../../modules/notifications/application/bundleHandlers/UrlMentionBundleHandler';
import { CollectionContributionBundleHandler } from '../../../modules/notifications/application/bundleHandlers/CollectionContributionBundleHandler';
import { SubscriptionBundleHandler } from '../../../modules/notifications/application/bundleHandlers/SubscriptionBundleHandler';
import { UserFollowedTargetEventHandler } from '../../../modules/notifications/application/eventHandlers/UserFollowedTargetEventHandler';
import { UserUnfollowedTargetEventHandler } from '../../../modules/notifications/application/eventHandlers/UserUnfollowedTargetEventHandler';
import { EventNames } from '../events/EventConfig';
import { IProcess } from '../../domain/IProcess';
import { IEventSubscriber } from '../../application/events/IEventSubscriber';
import {
  RepositoryFactory,
  Repositories,
} from '../http/factories/RepositoryFactory';
import { ConnectionCreatedEventHandler } from 'src/modules/feeds/application/eventHandlers/ConnectionCreatedEventHandler';
import { ConnectionCreatedEventHandler as NotificationConnectionCreatedEventHandler } from 'src/modules/notifications/application/eventHandlers/ConnectionCreatedEventHandler';
import { ConnectionRemovedEventHandler } from 'src/modules/notifications/application/eventHandlers/ConnectionRemovedEventHandler';
import { CollectionUrlResolver } from 'src/modules/notifications/application/services/CollectionUrlResolver';
import { BundleRecipientResolver } from 'src/modules/notifications/application/services/BundleRecipientResolver';

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

    // Notification bundle handlers
    const viaCardBundleHandler = new ViaCardBundleHandler(
      repositories.cardRepository,
      useCases.createNotificationUseCase,
    );
    const urlMentionBundleHandler = new UrlMentionBundleHandler(
      repositories.cardRepository,
      repositories.collectionRepository,
      repositories.userRepository,
      services.identityResolutionService,
      repositories.atUriResolutionService,
      this.configService,
      useCases.createNotificationUseCase,
    );
    const collectionContributionBundleHandler =
      new CollectionContributionBundleHandler(
        repositories.collectionRepository,
        useCases.createNotificationUseCase,
      );
    const collectionUrlResolver = new CollectionUrlResolver(
      services.identityResolutionService,
      repositories.atUriResolutionService,
      repositories.collectionRepository,
      this.configService,
    );

    const bundleRecipientResolver = new BundleRecipientResolver(
      repositories.cardRepository,
      repositories.collectionRepository,
      repositories.userRepository,
      services.identityResolutionService,
      repositories.atUriResolutionService,
      this.configService,
    );

    const subscriptionBundleHandler = new SubscriptionBundleHandler(
      repositories.followsRepository,
      repositories.cardRepository,
      useCases.createNotificationUseCase,
      collectionUrlResolver,
      bundleRecipientResolver,
    );

    const notificationBundlingSaga = new CardActivityBundlingSaga(
      services.sagaStateStore,
      [
        viaCardBundleHandler,
        urlMentionBundleHandler,
        collectionContributionBundleHandler,
        subscriptionBundleHandler,
      ],
    );

    const notificationCardActivityBufferingHandler =
      new CardActivityBufferingHandler(notificationBundlingSaga);

    const notificationCardLibraryRemovalCleanupHandler =
      new CardLibraryRemovalCleanupHandler(
        repositories.notificationRepository,
        notificationBundlingSaga,
      );
    const notificationCardCollectionRemovalCleanupHandler =
      new CardCollectionRemovalCleanupHandler(
        repositories.notificationRepository,
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

    const connectionCreatedHandler = new ConnectionCreatedEventHandler(
      useCases.addActivityToFeedUseCase,
    );

    const notificationConnectionCreatedHandler =
      new NotificationConnectionCreatedEventHandler(
        services.notificationService,
        repositories.connectionRepository,
        repositories.cardQueryRepository,
        this.configService,
        repositories.userRepository,
        services.identityResolutionService,
        repositories.collectionRepository,
        repositories.atUriResolutionService,
        repositories.followsRepository,
        collectionUrlResolver,
        useCases.createNotificationUseCase,
      );

    const connectionRemovedHandler = new ConnectionRemovedEventHandler(
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

    // Register notification handlers — all card add events go through the
    // bundling saga; removal events go to direct cleanup handlers.
    await subscriber.subscribe(
      EventNames.CARD_ADDED_TO_LIBRARY,
      notificationCardActivityBufferingHandler,
    );
    await subscriber.subscribe(
      EventNames.CARD_ADDED_TO_COLLECTION,
      notificationCardActivityBufferingHandler,
    );
    await subscriber.subscribe(
      EventNames.CARD_REMOVED_FROM_LIBRARY,
      notificationCardLibraryRemovalCleanupHandler,
    );
    await subscriber.subscribe(
      EventNames.CARD_REMOVED_FROM_COLLECTION,
      notificationCardCollectionRemovalCleanupHandler,
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

    await subscriber.subscribe(
      EventNames.CONNECTION_CREATED,
      connectionCreatedHandler,
    );

    // Register notification handler for connections
    await subscriber.subscribe(
      EventNames.CONNECTION_CREATED,
      notificationConnectionCreatedHandler,
    );

    await subscriber.subscribe(
      EventNames.CONNECTION_REMOVED,
      connectionRemovedHandler,
    );
  }
}
