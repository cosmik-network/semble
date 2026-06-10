import { EnvironmentConfigService } from '../config/EnvironmentConfigService';
import {
  ServiceFactory,
  WorkerServices,
} from '../http/factories/ServiceFactory';
import { UseCaseFactory } from '../http/factories/UseCaseFactory';
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
import { QueueNames } from '../events/QueueConfig';
import { EventNames } from '../events/EventConfig';
import { BaseWorkerProcess } from './BaseWorkerProcess';
import { IEventSubscriber } from '../../application/events/IEventSubscriber';
import { Repositories } from '../http/factories/RepositoryFactory';
import { ConnectionCreatedEventHandler } from 'src/modules/notifications/application/eventHandlers/ConnectionCreatedEventHandler';
import { ConnectionRemovedEventHandler } from 'src/modules/notifications/application/eventHandlers/ConnectionRemovedEventHandler';

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

    // Bundle handlers — each represents one notification policy that consumes
    // a CardActivityBundle and decides what notifications to write.
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

    const subscriptionBundleHandler = new SubscriptionBundleHandler(
      repositories.followsRepository,
      repositories.cardRepository,
      useCases.createNotificationUseCase,
    );

    const bundlingSaga = new CardActivityBundlingSaga(services.sagaStateStore, [
      viaCardBundleHandler,
      urlMentionBundleHandler,
      collectionContributionBundleHandler,
      subscriptionBundleHandler,
    ]);

    const cardActivityBufferingHandler = new CardActivityBufferingHandler(
      bundlingSaga,
    );

    const cardLibraryRemovalCleanupHandler =
      new CardLibraryRemovalCleanupHandler(
        repositories.notificationRepository,
        bundlingSaga,
      );

    const cardCollectionRemovalCleanupHandler =
      new CardCollectionRemovalCleanupHandler(
        repositories.notificationRepository,
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

    const connectionCreatedHandler = new ConnectionCreatedEventHandler(
      services.notificationService,
      repositories.connectionRepository,
      repositories.cardQueryRepository,
      this.configService,
      repositories.userRepository,
      services.identityResolutionService,
      repositories.collectionRepository,
      repositories.atUriResolutionService,
    );

    const connectionRemovedHandler = new ConnectionRemovedEventHandler(
      repositories.notificationRepository,
    );

    // Card add events all funnel into the bundling saga.
    await subscriber.subscribe(
      EventNames.CARD_ADDED_TO_LIBRARY,
      cardActivityBufferingHandler,
    );
    await subscriber.subscribe(
      EventNames.CARD_ADDED_TO_COLLECTION,
      cardActivityBufferingHandler,
    );

    // Removal events bypass the saga; cleanup is policy-specific.
    await subscriber.subscribe(
      EventNames.CARD_REMOVED_FROM_LIBRARY,
      cardLibraryRemovalCleanupHandler,
    );
    await subscriber.subscribe(
      EventNames.CARD_REMOVED_FROM_COLLECTION,
      cardCollectionRemovalCleanupHandler,
    );

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
    await subscriber.subscribe(
      EventNames.CONNECTION_REMOVED,
      connectionRemovedHandler,
    );
  }
}
