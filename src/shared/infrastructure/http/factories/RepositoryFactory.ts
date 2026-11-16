import { DatabaseFactory } from '../../database/DatabaseFactory';
import {
  Environment,
  EnvironmentConfigService,
} from '../../config/EnvironmentConfigService';
import { RedisFactory } from '../../redis/RedisFactory';
import { DrizzleUserRepository } from '../../../../modules/user/infrastructure/repositories/DrizzleUserRepository';
import { DrizzleUserOnboardingRepository } from '../../../../modules/user/infrastructure/repositories/DrizzleUserOnboardingRepository';
import { DrizzleTokenRepository } from '../../../../modules/user/infrastructure/repositories/DrizzleTokenRepository';
import { DrizzleApiKeyRepository } from '../../../../modules/user/infrastructure/repositories/DrizzleApiKeyRepository';
import { DrizzleCardRepository } from '../../../../modules/cards/infrastructure/repositories/DrizzleCardRepository';
import { DrizzleCardQueryRepository } from '../../../../modules/cards/infrastructure/repositories/DrizzleCardQueryRepository';
import { DrizzleCollectionRepository } from '../../../../modules/cards/infrastructure/repositories/DrizzleCollectionRepository';
import { DrizzleCollectionQueryRepository } from '../../../../modules/cards/infrastructure/repositories/DrizzleCollectionQueryRepository';
import { DrizzleTagQueryRepository } from '../../../../modules/cards/infrastructure/repositories/DrizzleTagQueryRepository';
import { ITagQueryRepository } from '../../../../modules/cards/domain/ITagQueryRepository';
import { DrizzleConnectionRepository } from '../../../../modules/cards/infrastructure/repositories/DrizzleConnectionRepository';
import { DrizzleConnectionQueryRepository } from '../../../../modules/cards/infrastructure/repositories/DrizzleConnectionQueryRepository';
import { DrizzleAppPasswordSessionRepository } from 'src/modules/atproto/infrastructure/repositories/DrizzleAppPasswordSessionRepository';
import { InMemoryCardRepository } from '../../../../modules/cards/tests/utils/InMemoryCardRepository';
import { InMemoryCardQueryRepository } from '../../../../modules/cards/tests/utils/InMemoryCardQueryRepository';
import { InMemoryCollectionRepository } from '../../../../modules/cards/tests/utils/InMemoryCollectionRepository';
import { InMemoryCollectionQueryRepository } from '../../../../modules/cards/tests/utils/InMemoryCollectionQueryRepository';
import { InMemoryTagQueryRepository } from '../../../../modules/cards/tests/utils/InMemoryTagQueryRepository';
import { InMemoryConnectionRepository } from '../../../../modules/cards/tests/utils/InMemoryConnectionRepository';
import { InMemoryConnectionQueryRepository } from '../../../../modules/cards/tests/utils/InMemoryConnectionQueryRepository';
import { InMemoryUserRepository } from '../../../../modules/user/tests/infrastructure/InMemoryUserRepository';
import { InMemoryUserOnboardingRepository } from '../../../../modules/user/tests/infrastructure/InMemoryUserOnboardingRepository';
import { InMemoryTokenRepository } from '../../../../modules/user/tests/infrastructure/InMemoryTokenRepository';
import { InMemoryApiKeyRepository } from '../../../../modules/user/tests/infrastructure/InMemoryApiKeyRepository';
import { InMemoryAppPasswordSessionRepository } from '../../../../modules/atproto/tests/infrastructure/InMemoryAppPasswordSessionRepository';
import { ICardRepository } from 'src/modules/cards/domain/ICardRepository';
import { ICardQueryRepository } from 'src/modules/cards/domain/ICardQueryRepository';
import { ICollectionRepository } from 'src/modules/cards/domain/ICollectionRepository';
import { ICollectionQueryRepository } from 'src/modules/cards/domain/ICollectionQueryRepository';
import { IConnectionRepository } from 'src/modules/cards/domain/IConnectionRepository';
import { IConnectionQueryRepository } from 'src/modules/cards/domain/IConnectionQueryRepository';
import { IUserRepository } from 'src/modules/user/domain/repositories/IUserRepository';
import { IUserOnboardingRepository } from 'src/modules/user/domain/repositories/IUserOnboardingRepository';
import { ITokenRepository } from 'src/modules/user/domain/repositories/ITokenRepository';
import { IApiKeyRepository } from 'src/modules/user/domain/repositories/IApiKeyRepository';
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
import { IUserStatsRepository } from '../../../../modules/user/domain/IUserStatsRepository';
import { DrizzleUserStatsRepository } from '../../../../modules/user/infrastructure/repositories/DrizzleUserStatsRepository';
import { IGraphQueryRepository } from '../../../../modules/cards/domain/IGraphQueryRepository';
import { DrizzleGraphQueryRepository } from '../../../../modules/cards/infrastructure/repositories/DrizzleGraphQueryRepository';
import { InMemoryGraphQueryRepository } from '../../../../modules/cards/tests/utils/InMemoryGraphQueryRepository';
import { IProductAnalyticsQueryRepository } from '../../../../modules/analytics/domain/IProductAnalyticsQueryRepository';
import { DrizzleProductAnalyticsQueryRepository } from '../../../../modules/analytics/infrastructure/repositories/DrizzleProductAnalyticsQueryRepository';
import { IApiRequestLogRepository } from '../../../../modules/analytics/domain/IApiRequestLogRepository';
import { DrizzleApiRequestLogRepository } from '../../../../modules/analytics/infrastructure/repositories/DrizzleApiRequestLogRepository';
import { ICanvasRepository } from 'src/modules/canvas/domain/ICanvasRepository';
import { ICanvasObjectStore } from 'src/modules/canvas/domain/ICanvasObjectStore';
import { DrizzleCanvasRepository } from 'src/modules/canvas/infrastructure/repositories/DrizzleCanvasRepository';
import { S3CanvasObjectStore } from 'src/modules/canvas/infrastructure/storage/S3CanvasObjectStore';
import { FileCanvasObjectStore } from 'src/modules/canvas/infrastructure/storage/FileCanvasObjectStore';
import { UnavailableCanvasObjectStore } from 'src/modules/canvas/infrastructure/storage/UnavailableCanvasObjectStore';
import { InMemoryCanvasRepository } from 'src/modules/canvas/tests/utils/InMemoryCanvasRepository';
import { InMemoryCanvasObjectStore } from 'src/modules/canvas/tests/utils/InMemoryCanvasObjectStore';

export interface Repositories {
  userRepository: IUserRepository;
  userOnboardingRepository: IUserOnboardingRepository;
  userStatsRepository: IUserStatsRepository;
  productAnalyticsQueryRepository: IProductAnalyticsQueryRepository;
  apiRequestLogRepository: IApiRequestLogRepository;
  tokenRepository: ITokenRepository;
  apiKeyRepository: IApiKeyRepository;
  cardRepository: ICardRepository;
  cardQueryRepository: ICardQueryRepository;
  collectionRepository: ICollectionRepository;
  collectionQueryRepository: ICollectionQueryRepository;
  tagQueryRepository: ITagQueryRepository;
  connectionRepository: IConnectionRepository;
  connectionQueryRepository: IConnectionQueryRepository;
  graphQueryRepository: IGraphQueryRepository;
  appPasswordSessionRepository: IAppPasswordSessionRepository;
  feedRepository: IFeedRepository;
  followsRepository: IFollowsRepository;
  notificationRepository: INotificationRepository;
  syncStatusRepository: ISyncStatusRepository;
  atUriResolutionService: IAtUriResolutionService;
  oauthStateStore: NodeSavedStateStore;
  oauthSessionStore: NodeSavedSessionStore;
  canvasRepository: ICanvasRepository;
  canvasObjectStore: ICanvasObjectStore;
}

export class RepositoryFactory {
  static create(configService: EnvironmentConfigService): Repositories {
    const useMockRepos = configService.shouldUseMockRepos();

    if (useMockRepos) {
      // Use singleton instances to ensure same data across processes
      const userRepository = InMemoryUserRepository.getInstance();
      const userOnboardingRepository =
        InMemoryUserOnboardingRepository.getInstance();
      const tokenRepository = InMemoryTokenRepository.getInstance();
      const apiKeyRepository = InMemoryApiKeyRepository.getInstance();
      const cardRepository = InMemoryCardRepository.getInstance();
      const collectionRepository = InMemoryCollectionRepository.getInstance();
      const connectionRepository = InMemoryConnectionRepository.getInstance();
      const cardQueryRepository = new InMemoryCardQueryRepository(
        cardRepository,
        collectionRepository,
        connectionRepository,
      );
      const collectionQueryRepository = new InMemoryCollectionQueryRepository(
        collectionRepository,
        cardRepository,
      );
      const connectionQueryRepository = new InMemoryConnectionQueryRepository(
        connectionRepository,
      );
      const tagQueryRepository = new InMemoryTagQueryRepository(
        cardRepository,
        connectionRepository,
        collectionRepository,
      );
      const graphQueryRepository = InMemoryGraphQueryRepository.getInstance();
      const appPasswordSessionRepository =
        InMemoryAppPasswordSessionRepository.getInstance();
      const feedRepository = InMemoryFeedRepository.getInstance();
      const followsRepository = InMemoryFollowsRepository.getInstance();
      const atUriResolutionService = new InMemoryAtUriResolutionService(
        collectionRepository,
        cardRepository,
        connectionRepository,
      );
      const notificationRepository =
        InMemoryNotificationRepository.getInstance();
      // Inject dependencies into notification repository
      notificationRepository.setDependencies(
        cardQueryRepository,
        connectionRepository,
      );
      const syncStatusRepository = InMemorySyncStatusRepository.getInstance();
      const oauthStateStore = InMemoryStateStore.getInstance();
      const oauthSessionStore = InMemorySessionStore.getInstance();
      const canvasObjectStore = new InMemoryCanvasObjectStore();
      const canvasRepository =
        InMemoryCanvasRepository.getInstance(canvasObjectStore);

      // For mock repos, we'll use a basic implementation of stats repository
      // Since it's read-only stats, we can create a simple instance
      const db = DatabaseFactory.createConnection(
        configService.getDatabaseConfig(),
      );
      const statsDb = DatabaseFactory.createStatsConnection(
        configService.getDatabaseConfig(),
      );
      const userStatsRepository = new DrizzleUserStatsRepository(statsDb);
      const productAnalyticsQueryRepository =
        new DrizzleProductAnalyticsQueryRepository(statsDb);
      const apiRequestLogRepository = new DrizzleApiRequestLogRepository(db);

      return {
        canvasRepository,
        canvasObjectStore,
        userRepository,
        userOnboardingRepository,
        userStatsRepository,
        productAnalyticsQueryRepository,
        apiRequestLogRepository,
        tokenRepository,
        apiKeyRepository,
        cardRepository,
        cardQueryRepository,
        collectionRepository,
        collectionQueryRepository,
        tagQueryRepository,
        connectionRepository,
        connectionQueryRepository,
        graphQueryRepository,
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

    // Stats queries get their own capped pool (see createStatsConnection)
    const statsDb = DatabaseFactory.createStatsConnection(
      configService.getDatabaseConfig(),
    );

    const oauthStateStore = new DrizzleStateStore(db);
    const oauthSessionStore = new DrizzleSessionStore(db);

    // Tigris (or any S3 endpoint) when S3_* is configured. Local development
    // falls back to bytes on disk; dev/prod have no fallback — canvas routes
    // fail loudly instead of writing to ephemeral machine disks.
    const objectStoreConfig = configService.getObjectStoreConfig();
    const s3Configured =
      objectStoreConfig.bucket &&
      objectStoreConfig.accessKeyId &&
      objectStoreConfig.secretAccessKey;
    let canvasObjectStore: ICanvasObjectStore;
    if (s3Configured) {
      canvasObjectStore = new S3CanvasObjectStore({
        bucket: objectStoreConfig.bucket!,
        region: objectStoreConfig.region,
        accessKeyId: objectStoreConfig.accessKeyId!,
        secretAccessKey: objectStoreConfig.secretAccessKey!,
        endpoint: objectStoreConfig.endpoint,
      });
    } else if (configService.get().environment === Environment.LOCAL) {
      canvasObjectStore = new FileCanvasObjectStore(
        objectStoreConfig.localDirectory,
      );
    } else {
      console.error(
        '[canvas] S3 object storage is not configured (S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_ACCESS_KEY/S3_ENDPOINT); canvas routes will fail until the secrets are set',
      );
      canvasObjectStore = new UnavailableCanvasObjectStore();
    }
    const canvasRepository = new DrizzleCanvasRepository(db, canvasObjectStore);

    return {
      canvasRepository,
      canvasObjectStore,
      userRepository: new DrizzleUserRepository(db),
      userOnboardingRepository: new DrizzleUserOnboardingRepository(db),
      userStatsRepository: new DrizzleUserStatsRepository(statsDb),
      productAnalyticsQueryRepository:
        new DrizzleProductAnalyticsQueryRepository(statsDb),
      apiRequestLogRepository: new DrizzleApiRequestLogRepository(db),
      tokenRepository: new DrizzleTokenRepository(db),
      apiKeyRepository: new DrizzleApiKeyRepository(db),
      cardRepository: new DrizzleCardRepository(db),
      cardQueryRepository: new DrizzleCardQueryRepository(db),
      collectionRepository: new DrizzleCollectionRepository(db),
      collectionQueryRepository: new DrizzleCollectionQueryRepository(db),
      tagQueryRepository: new DrizzleTagQueryRepository(db),
      connectionRepository: new DrizzleConnectionRepository(db),
      connectionQueryRepository: new DrizzleConnectionQueryRepository(db),
      graphQueryRepository: new DrizzleGraphQueryRepository(db),
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
