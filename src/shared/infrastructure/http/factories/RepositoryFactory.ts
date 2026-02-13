import { DatabaseFactory } from '../../database/DatabaseFactory';
import { EnvironmentConfigService } from '../../config/EnvironmentConfigService';
import { RedisFactory } from '../../redis/RedisFactory';
import { DrizzleUserRepository } from '../../../../modules/user/infrastructure/repositories/DrizzleUserRepository';
import { DrizzleTokenRepository } from '../../../../modules/user/infrastructure/repositories/DrizzleTokenRepository';
import { DrizzleCardRepository } from '../../../../modules/cards/infrastructure/repositories/DrizzleCardRepository';
import { DrizzleCardQueryRepository } from '../../../../modules/cards/infrastructure/repositories/DrizzleCardQueryRepository';
import { DrizzleCollectionRepository } from '../../../../modules/cards/infrastructure/repositories/DrizzleCollectionRepository';
import { DrizzleCollectionQueryRepository } from '../../../../modules/cards/infrastructure/repositories/DrizzleCollectionQueryRepository';
import { DrizzleAppPasswordSessionRepository } from 'src/modules/atproto/infrastructure/repositories/DrizzleAppPasswordSessionRepository';
import { InMemoryCardRepository } from '../../../../modules/cards/tests/utils/InMemoryCardRepository';
import { InMemoryCardQueryRepository } from '../../../../modules/cards/tests/utils/InMemoryCardQueryRepository';
import { InMemoryCollectionRepository } from '../../../../modules/cards/tests/utils/InMemoryCollectionRepository';
import { InMemoryCollectionQueryRepository } from '../../../../modules/cards/tests/utils/InMemoryCollectionQueryRepository';
import { InMemoryUserRepository } from '../../../../modules/user/tests/infrastructure/InMemoryUserRepository';
import { InMemoryTokenRepository } from '../../../../modules/user/tests/infrastructure/InMemoryTokenRepository';
import { InMemoryAppPasswordSessionRepository } from '../../../../modules/atproto/tests/infrastructure/InMemoryAppPasswordSessionRepository';
import { ICardRepository } from 'src/modules/cards/domain/ICardRepository';
import { ICardQueryRepository } from 'src/modules/cards/domain/ICardQueryRepository';
import { ICollectionRepository } from 'src/modules/cards/domain/ICollectionRepository';
import { ICollectionQueryRepository } from 'src/modules/cards/domain/ICollectionQueryRepository';
import { IUserRepository } from 'src/modules/user/domain/repositories/IUserRepository';
import { ITokenRepository } from 'src/modules/user/domain/repositories/ITokenRepository';
import { IAppPasswordSessionRepository } from 'src/modules/atproto/infrastructure/repositories/IAppPasswordSessionRepository';
import { DrizzleStateStore } from '../../../../modules/user/infrastructure/services/DrizzleStateStore';
import { DrizzleSessionStore } from '../../../../modules/user/infrastructure/services/DrizzleSessionStore';
import { InMemoryStateStore } from '../../../../modules/user/tests/infrastructure/InMemoryStateStore';
import { InMemorySessionStore } from '../../../../modules/user/tests/infrastructure/InMemorySessionStore';
import {
  NodeSavedStateStore,
  NodeSavedSessionStore,
} from '@atproto/oauth-client-node';
import { DrizzleFeedRepository } from '../../../../modules/feeds/infrastructure/repositories/DrizzleFeedRepository';
import { InMemoryFeedRepository } from '../../../../modules/feeds/tests/infrastructure/InMemoryFeedRepository';
import { IFeedRepository } from '../../../../modules/feeds/domain/IFeedRepository';
import { IAtUriResolutionService } from '../../../../modules/cards/domain/services/IAtUriResolutionService';
import { DrizzleAtUriResolutionService } from '../../../../modules/cards/infrastructure/services/DrizzleAtUriResolutionService';
import { InMemoryAtUriResolutionService } from '../../../../modules/cards/tests/utils/InMemoryAtUriResolutionService';
import { INotificationRepository } from '../../../../modules/notifications/domain/INotificationRepository';
import { DrizzleNotificationRepository } from '../../../../modules/notifications/infrastructure/repositories/DrizzleNotificationRepository';
import { InMemoryNotificationRepository } from '../../../../modules/notifications/tests/infrastructure/InMemoryNotificationRepository';
import { ISyncStatusRepository } from '../../../../modules/sync/domain/repositories/ISyncStatusRepository';
import { DrizzleSyncStatusRepository } from '../../../../modules/sync/infrastructure/repositories/DrizzleSyncStatusRepository';
import { InMemorySyncStatusRepository } from '../../../../modules/sync/tests/infrastructure/InMemorySyncStatusRepository';
import { IFollowsRepository } from '../../../../modules/user/domain/repositories/IFollowsRepository';
import { DrizzleFollowsRepository } from '../../../../modules/user/infrastructure/repositories/DrizzleFollowsRepository';
import { InMemoryFollowsRepository } from '../../../../modules/user/tests/infrastructure/InMemoryFollowsRepository';

export interface Repositories {
  userRepository: IUserRepository;
  tokenRepository: ITokenRepository;
  cardRepository: ICardRepository;
  cardQueryRepository: ICardQueryRepository;
  collectionRepository: ICollectionRepository;
  collectionQueryRepository: ICollectionQueryRepository;
  appPasswordSessionRepository: IAppPasswordSessionRepository;
  feedRepository: IFeedRepository;
  followsRepository: IFollowsRepository;
  notificationRepository: INotificationRepository;
  syncStatusRepository: ISyncStatusRepository;
  atUriResolutionService: IAtUriResolutionService;
  oauthStateStore: NodeSavedStateStore;
  oauthSessionStore: NodeSavedSessionStore;
}

export class RepositoryFactory {
  static create(configService: EnvironmentConfigService): Repositories {
    const useMockRepos = configService.shouldUseMockRepos();

    if (useMockRepos) {
      // Use singleton instances to ensure same data across processes
      const userRepository = InMemoryUserRepository.getInstance();
      const tokenRepository = InMemoryTokenRepository.getInstance();
      const cardRepository = InMemoryCardRepository.getInstance();
      const collectionRepository = InMemoryCollectionRepository.getInstance();
      const cardQueryRepository = new InMemoryCardQueryRepository(
        cardRepository,
        collectionRepository,
      );
      const collectionQueryRepository = new InMemoryCollectionQueryRepository(
        collectionRepository,
        cardRepository,
      );
      const appPasswordSessionRepository =
        InMemoryAppPasswordSessionRepository.getInstance();
      const feedRepository = InMemoryFeedRepository.getInstance();
      const followsRepository = InMemoryFollowsRepository.getInstance();
      const atUriResolutionService = new InMemoryAtUriResolutionService(
        collectionRepository,
        cardRepository,
      );
      const notificationRepository =
        InMemoryNotificationRepository.getInstance();
      // Inject dependencies into notification repository
      notificationRepository.setDependencies(cardQueryRepository);
      const syncStatusRepository = InMemorySyncStatusRepository.getInstance();
      const oauthStateStore = InMemoryStateStore.getInstance();
      const oauthSessionStore = InMemorySessionStore.getInstance();

      return {
        userRepository,
        tokenRepository,
        cardRepository,
        cardQueryRepository,
        collectionRepository,
        collectionQueryRepository,
        appPasswordSessionRepository,
        feedRepository,
        followsRepository,
        notificationRepository,
        syncStatusRepository,
        atUriResolutionService,
        oauthStateStore,
        oauthSessionStore,
      };
    }

    const db = DatabaseFactory.createConnection(
      configService.getDatabaseConfig(),
    );

    const oauthStateStore = new DrizzleStateStore(db);
    const oauthSessionStore = new DrizzleSessionStore(db);

    return {
      userRepository: new DrizzleUserRepository(db),
      tokenRepository: new DrizzleTokenRepository(db),
      cardRepository: new DrizzleCardRepository(db),
      cardQueryRepository: new DrizzleCardQueryRepository(db),
      collectionRepository: new DrizzleCollectionRepository(db),
      collectionQueryRepository: new DrizzleCollectionQueryRepository(db),
      appPasswordSessionRepository: new DrizzleAppPasswordSessionRepository(db),
      feedRepository: new DrizzleFeedRepository(db),
      followsRepository: new DrizzleFollowsRepository(db),
      notificationRepository: new DrizzleNotificationRepository(db),
      syncStatusRepository: new DrizzleSyncStatusRepository(db),
      atUriResolutionService: new DrizzleAtUriResolutionService(db),
      oauthStateStore,
      oauthSessionStore,
    };
  }
}
