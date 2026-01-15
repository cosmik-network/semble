import { EnvironmentConfigService } from '../../config/EnvironmentConfigService';
import { jwtConfig, oauthConfig } from '../../config';
import { JwtTokenService } from '../../../../modules/user/infrastructure/services/JwtTokenService';
import {
  AtProtoOAuthProcessor,
  OAuthClientFactory,
} from '../../../../modules/user/infrastructure';
import { UserAuthenticationService } from '../../../../modules/user/infrastructure/services/UserAuthenticationService';
import { ATProtoAgentService } from '../../../../modules/atproto/infrastructure/services/ATProtoAgentService';
import { IFramelyMetadataService } from '../../../../modules/cards/infrastructure/IFramelyMetadataService';
import { CitoidMetadataService } from '../../../../modules/cards/infrastructure/CitoidMetadataService';
import { CompositeMetadataService } from '../../../../modules/cards/infrastructure/CompositeMetadataService';
import { CachedMetadataService } from '../../../../modules/cards/infrastructure/CachedMetadataService';
import { BlueskyProfileService } from '../../../../modules/atproto/infrastructure/services/BlueskyProfileService';
import { CachedBlueskyProfileService } from '../../../../modules/atproto/infrastructure/services/CachedBlueskyProfileService';
import { ATProtoCollectionPublisher } from '../../../../modules/atproto/infrastructure/publishers/ATProtoCollectionPublisher';
import { ATProtoCardPublisher } from '../../../../modules/atproto/infrastructure/publishers/ATProtoCardPublisher';
import { FakeCollectionPublisher } from '../../../../modules/cards/tests/utils/FakeCollectionPublisher';
import { FakeCardPublisher } from '../../../../modules/cards/tests/utils/FakeCardPublisher';
import { CardLibraryService } from '../../../../modules/cards/domain/services/CardLibraryService';
import { CardCollectionService } from '../../../../modules/cards/domain/services/CardCollectionService';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { Repositories } from './RepositoryFactory';
import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { AppPasswordSessionService } from 'src/modules/atproto/infrastructure/services/AppPasswordSessionService';
import { AtpAppPasswordProcessor } from 'src/modules/atproto/infrastructure/services/AtpAppPasswordProcessor';
import { ICollectionPublisher } from 'src/modules/cards/application/ports/ICollectionPublisher';
import { ICardPublisher } from 'src/modules/cards/application/ports/ICardPublisher';
import { IMetadataService } from 'src/modules/cards/domain/services/IMetadataService';
import { BullMQEventSubscriber } from '../../events/BullMQEventSubscriber';
import { BullMQEventPublisher } from '../../events/BullMQEventPublisher';
import { InMemoryEventPublisher } from '../../events/InMemoryEventPublisher';
import { InMemoryEventSubscriber } from '../../events/InMemoryEventSubscriber';
import Redis from 'ioredis';
// Mock/Fake service imports
import { FakeJwtTokenService } from '../../../../modules/user/infrastructure/services/FakeJwtTokenService';
import { FakeAtProtoOAuthProcessor } from '../../../../modules/atproto/infrastructure/services/FakeAtProtoOAuthProcessor';
import { FakeUserAuthenticationService } from '../../../../modules/user/infrastructure/services/FakeUserAuthenticationService';
import { FakeAgentService } from '../../../../modules/atproto/infrastructure/services/FakeAgentService';
import { FakeAppPasswordSessionService } from '../../../../modules/atproto/infrastructure/services/FakeAppPasswordSessionService';
import { FakeAtpAppPasswordProcessor } from '../../../../modules/atproto/infrastructure/services/FakeAtpAppPasswordProcessor';
import { ITokenService } from 'src/modules/user/application/services/ITokenService';
import { IOAuthProcessor } from 'src/modules/user/application/services/IOAuthProcessor';
import { IAppPasswordProcessor } from 'src/modules/atproto/application/IAppPasswordProcessor';
import { IUserAuthenticationService } from 'src/modules/user/domain/services/IUserAuthenticationService';
import { IAgentService } from 'src/modules/atproto/application/IAgentService';
import { IProfileService } from 'src/modules/cards/domain/services/IProfileService';
import { IEventPublisher } from '../../../application/events/IEventPublisher';
import { QueueName } from '../../events/QueueConfig';
import { RedisFactory } from '../../redis/RedisFactory';
import { IEventSubscriber } from 'src/shared/application/events/IEventSubscriber';
import { FeedService } from '../../../../modules/feeds/domain/services/FeedService';
import { ATProtoIdentityResolutionService } from '../../../../modules/atproto/infrastructure/services/ATProtoIdentityResolutionService';
import { IIdentityResolutionService } from '../../../../modules/atproto/domain/services/IIdentityResolutionService';
import { CookieService } from '../services/CookieService';
import { InMemorySagaStateStore } from '../../../../modules/feeds/infrastructure/InMemorySagaStateStore';
import { RedisSagaStateStore } from '../../../../modules/feeds/infrastructure/RedisSagaStateStore';
import { ISagaStateStore } from 'src/modules/feeds/application/sagas/ISagaStateStore';
import { SearchService } from '../../../../modules/search/domain/services/SearchService';
import { IVectorDatabase } from '../../../../modules/search/domain/IVectorDatabase';
import { InMemoryVectorDatabase } from '../../../../modules/search/infrastructure/InMemoryVectorDatabase';
import { UpstashVectorDatabase } from '../../../../modules/search/infrastructure/UpstashVectorDatabase';
import { NotificationService } from '../../../../modules/notifications/domain/services/NotificationService';

// Shared services needed by both web app and workers
export interface SharedServices {
  tokenService: ITokenService;
  userAuthService: IUserAuthenticationService;
  atProtoAgentService: IAgentService;
  metadataService: IMetadataService;
  profileService: IProfileService;
  feedService: FeedService;
  notificationService: NotificationService;
  nodeOauthClient: NodeOAuthClient;
  identityResolutionService: IIdentityResolutionService;
  configService: EnvironmentConfigService;
  cookieService: CookieService;
  searchService: SearchService;
  leafletSearchService: LeafletSearchService;
  cardLibraryService: CardLibraryService;
  cardCollectionService: CardCollectionService;
  eventPublisher: IEventPublisher;
  collectionPublisher: ICollectionPublisher;
}

// Web app specific services (includes publishers, auth middleware)
export interface WebAppServices extends SharedServices {
  oauthProcessor: IOAuthProcessor;
  appPasswordProcessor: IAppPasswordProcessor;
  collectionPublisher: ICollectionPublisher;
  cardPublisher: ICardPublisher;
  authMiddleware: AuthMiddleware;
}

// Worker specific services (includes subscribers)
export interface WorkerServices extends SharedServices {
  redisConnection: Redis | null;
  createEventSubscriber: (queueName: QueueName) => IEventSubscriber;
  sagaStateStore: ISagaStateStore;
}

// Legacy interface for backward compatibility
export interface Services extends WebAppServices {}

export class ServiceFactory {
  static create(
    configService: EnvironmentConfigService,
    repositories: Repositories,
  ): Services {
    return this.createForWebApp(configService, repositories);
  }

  static createForWebApp(
    configService: EnvironmentConfigService,
    repositories: Repositories,
  ): WebAppServices {
    const sharedServices = this.createSharedServices(
      configService,
      repositories,
    );

    const useMockAuth = configService.shouldUseMockAuth();

    // App Password Session Service
    const appPasswordSessionService = useMockAuth
      ? new FakeAppPasswordSessionService()
      : new AppPasswordSessionService(
          repositories.appPasswordSessionRepository,
        );

    // App Password Processor
    const appPasswordProcessor = useMockAuth
      ? new FakeAtpAppPasswordProcessor()
      : new AtpAppPasswordProcessor(appPasswordSessionService);

    // OAuth Processor
    const oauthProcessor = useMockAuth
      ? new FakeAtProtoOAuthProcessor(sharedServices.tokenService)
      : new AtProtoOAuthProcessor(sharedServices.nodeOauthClient);

    const useFakePublishers = configService.shouldUseFakePublishers();
    const collections = configService.getAtProtoCollections();

    const collectionPublisher = useFakePublishers
      ? new FakeCollectionPublisher()
      : new ATProtoCollectionPublisher(
          sharedServices.atProtoAgentService,
          collections.collection,
          collections.collectionLink,
        );

    const cardPublisher = useFakePublishers
      ? new FakeCardPublisher()
      : new ATProtoCardPublisher(
          sharedServices.atProtoAgentService,
          collections.card,
        );

    const authMiddleware = new AuthMiddleware(
      sharedServices.tokenService,
      sharedServices.cookieService,
    );

    return {
      ...sharedServices,
      oauthProcessor,
      appPasswordProcessor,
      collectionPublisher,
      cardPublisher,
      authMiddleware,
    };
  }

  static createForWorker(
    configService: EnvironmentConfigService,
    repositories: Repositories,
  ): WorkerServices {
    const sharedServices = this.createSharedServices(
      configService,
      repositories,
    );

    const useInMemoryEvents = configService.shouldUseInMemoryEvents();

    let eventPublisher: IEventPublisher;
    let redisConnection: Redis | null = null;
    let createEventSubscriber: (queueName: QueueName) => IEventSubscriber;

    if (useInMemoryEvents) {
      eventPublisher = new InMemoryEventPublisher();
      createEventSubscriber = (queueName: QueueName) => {
        return new InMemoryEventSubscriber();
      };
    } else {
      // Redis connection is required for BullMQ workers
      if (!process.env.REDIS_URL) {
        throw new Error(
          'REDIS_URL environment variable is required for BullMQ worker services',
        );
      }

      const redisConfig = configService.getWorkersConfig().redisConfig;
      redisConnection = RedisFactory.createConnection(redisConfig);
      eventPublisher = new BullMQEventPublisher(redisConnection);

      createEventSubscriber = (queueName: QueueName) => {
        return new BullMQEventSubscriber(redisConnection!, { queueName });
      };
    }

    // Create appropriate saga state store
    const sagaStateStore = useInMemoryEvents
      ? new InMemorySagaStateStore()
      : new RedisSagaStateStore(redisConnection!);

    return {
      ...sharedServices,
      redisConnection: redisConnection,
      createEventSubscriber,
      sagaStateStore,
    };
  }

  private static createSharedServices(
    configService: EnvironmentConfigService,
    repositories: Repositories,
  ): SharedServices {
    const useMockAuth = configService.shouldUseMockAuth();

    const nodeOauthClient = OAuthClientFactory.createClient(
      repositories.oauthStateStore,
      repositories.oauthSessionStore,
      oauthConfig.baseUrl,
    );

    // Token Service
    const tokenService = useMockAuth
      ? new FakeJwtTokenService(repositories.tokenRepository)
      : new JwtTokenService(
          repositories.tokenRepository,
          jwtConfig.jwtSecret,
          jwtConfig.accessTokenExpiresIn,
          jwtConfig.refreshTokenExpiresIn,
        );

    // User Authentication Service
    const userAuthService = useMockAuth
      ? new FakeUserAuthenticationService(repositories.userRepository)
      : new UserAuthenticationService(repositories.userRepository);

    // App Password Session Service (needed for ATProto Agent Service)
    const appPasswordSessionService = useMockAuth
      ? new FakeAppPasswordSessionService()
      : new AppPasswordSessionService(
          repositories.appPasswordSessionRepository,
        );

    // ATProto Agent Service
    const atProtoAgentService = useMockAuth
      ? new FakeAgentService()
      : new ATProtoAgentService(
          nodeOauthClient,
          appPasswordSessionService,
          configService,
        );

    // Create individual metadata services
    const baseIframelyService = new IFramelyMetadataService(
      configService.getIFramelyApiKey(),
    );
    const baseCitoidService = new CitoidMetadataService();

    // Apply caching conditionally (similar to profile service)
    const useMockPersistence = configService.shouldUseMockPersistence();

    let iframelyService: IMetadataService;
    let citoidService: IMetadataService;

    if (useMockPersistence) {
      // No caching for mock persistence
      iframelyService = baseIframelyService;
      citoidService = baseCitoidService;
    } else {
      // Create Redis connection for caching
      const redisConfig = configService.getRedisConfig();
      const redis = RedisFactory.createConnection(redisConfig);

      // Wrap services with caching - different TTLs for different services
      iframelyService = new CachedMetadataService(
        baseIframelyService,
        redis,
        'iframely',
        3600 * 24 * 7, // 7 day TTL
      );
      citoidService = new CachedMetadataService(
        baseCitoidService,
        redis,
        'citoid',
        3600 * 24 * 7, // 7 day TTL
      );
    }

    // Create composite metadata service
    const metadataService = new CompositeMetadataService(
      iframelyService,
      citoidService,
    );

    // Profile Service with Redis caching
    const baseProfileService = new BlueskyProfileService(atProtoAgentService);

    let profileService: IProfileService;

    // caching requires persistence
    if (useMockPersistence) {
      profileService = baseProfileService;
    } else {
      // Create Redis connection for caching
      const redisConfig = configService.getRedisConfig();
      const redis = RedisFactory.createConnection(redisConfig);
      profileService = new CachedBlueskyProfileService(
        baseProfileService,
        redis,
      );
    }

    // Feed Service
    const feedService = new FeedService(repositories.feedRepository);

    // Notification Service
    const notificationService = new NotificationService(
      repositories.notificationRepository,
    );

    // Identity Resolution Service
    const identityResolutionService = new ATProtoIdentityResolutionService(
      atProtoAgentService,
    );

    // Cookie Service
    const cookieService = new CookieService(configService);

    // Create vector database and search service (shared by both web app and workers)
    const useMockVectorDb = configService.shouldUseMockVectorDb();

    const vectorDatabase: IVectorDatabase = useMockVectorDb
      ? InMemoryVectorDatabase.getInstance()
      : new UpstashVectorDatabase(
          configService.getUpstashConfig().vectorUrl,
          configService.getUpstashConfig().vectorToken,
        );

    const searchService = new SearchService(
      vectorDatabase,
      metadataService,
      repositories.cardQueryRepository,
    );

    // Create LeafletSearchService
    const leafletSearchService = new LeafletSearchService(metadataService);

    // Create publishers needed for shared services
    const useFakePublishers = configService.shouldUseFakePublishers();
    const collections = configService.getAtProtoCollections();

    const collectionPublisher = useFakePublishers
      ? new FakeCollectionPublisher()
      : new ATProtoCollectionPublisher(
          atProtoAgentService,
          collections.collection,
          collections.collectionLink,
        );

    const cardPublisher = useFakePublishers
      ? new FakeCardPublisher()
      : new ATProtoCardPublisher(atProtoAgentService, collections.card);

    // Create domain services
    const cardCollectionService = new CardCollectionService(
      repositories.collectionRepository,
      collectionPublisher,
      repositories.cardRepository,
    );
    const cardLibraryService = new CardLibraryService(
      repositories.cardRepository,
      cardPublisher,
      repositories.collectionRepository,
      cardCollectionService,
    );

    // Create event publisher
    const useInMemoryEvents = configService.shouldUseInMemoryEvents();

    let eventPublisher: IEventPublisher;
    if (useInMemoryEvents) {
      eventPublisher = new InMemoryEventPublisher();
    } else {
      const redisConnection = RedisFactory.createConnection(
        configService.getWorkersConfig().redisConfig,
      );
      eventPublisher = new BullMQEventPublisher(redisConnection);
    }

    return {
      tokenService,
      userAuthService,
      atProtoAgentService,
      metadataService,
      profileService,
      feedService,
      notificationService,
      nodeOauthClient,
      identityResolutionService,
      configService,
      cookieService,
      searchService,
      leafletSearchService,
      cardLibraryService,
      cardCollectionService,
      eventPublisher,
      collectionPublisher,
    };
  }
}
import { LeafletSearchService } from '../../../../modules/search/domain/services/LeafletSearchService';
