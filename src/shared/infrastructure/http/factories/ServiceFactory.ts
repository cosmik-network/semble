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
import { BlueskyProfileService } from '../../../../modules/atproto/infrastructure/services/BlueskyProfileService';
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
import { FakeBlueskyProfileService } from '../../../../modules/atproto/infrastructure/services/FakeBlueskyProfileService';
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
import { CardCollectionSaga } from '../../../../modules/feeds/application/sagas/CardCollectionSaga';

// Shared services needed by both web app and workers
export interface SharedServices {
  tokenService: ITokenService;
  userAuthService: IUserAuthenticationService;
  atProtoAgentService: IAgentService;
  metadataService: IMetadataService;
  profileService: IProfileService;
  feedService: FeedService;
}

// Web app specific services (includes publishers, auth middleware)
export interface WebAppServices extends SharedServices {
  nodeOauthClient: NodeOAuthClient;
  oauthProcessor: IOAuthProcessor;
  appPasswordProcessor: IAppPasswordProcessor;
  collectionPublisher: ICollectionPublisher;
  cardPublisher: ICardPublisher;
  cardLibraryService: CardLibraryService;
  cardCollectionService: CardCollectionService;
  authMiddleware: AuthMiddleware;
  eventPublisher: IEventPublisher;
}

// Worker specific services (includes subscribers)
export interface WorkerServices extends SharedServices {
  redisConnection: Redis | null;
  eventPublisher: IEventPublisher;
  createEventSubscriber: (queueName: QueueName) => IEventSubscriber;
  cardCollectionSaga: CardCollectionSaga;
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

    const useMockAuth = process.env.USE_MOCK_AUTH === 'true';

    // OAuth Client (always create for real, but may not be used if mocking)
    const nodeOauthClient = OAuthClientFactory.createClient(
      repositories.oauthStateStore,
      repositories.oauthSessionStore,
      oauthConfig.baseUrl,
    );

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
      : new AtProtoOAuthProcessor(nodeOauthClient);

    const useFakePublishers = process.env.USE_FAKE_PUBLISHERS === 'true';

    const collectionPublisher = useFakePublishers
      ? new FakeCollectionPublisher()
      : new ATProtoCollectionPublisher(sharedServices.atProtoAgentService);

    const cardPublisher = useFakePublishers
      ? new FakeCardPublisher()
      : new ATProtoCardPublisher(sharedServices.atProtoAgentService);

    const cardLibraryService = new CardLibraryService(
      repositories.cardRepository,
      cardPublisher,
    );
    const cardCollectionService = new CardCollectionService(
      repositories.collectionRepository,
      collectionPublisher,
    );

    const authMiddleware = new AuthMiddleware(sharedServices.tokenService);

    const useInMemoryEvents = process.env.USE_IN_MEMORY_EVENTS === 'true';

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
      ...sharedServices,
      nodeOauthClient,
      oauthProcessor,
      appPasswordProcessor,
      collectionPublisher,
      cardPublisher,
      cardLibraryService,
      cardCollectionService,
      authMiddleware,
      eventPublisher,
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

    const useInMemoryEvents = process.env.USE_IN_MEMORY_EVENTS === 'true';

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

    // Create saga for worker
    const cardCollectionSaga = new CardCollectionSaga(
      // We'll need to create this use case in the worker context
      null as any, // Will be set properly in worker
    );

    return {
      ...sharedServices,
      redisConnection: redisConnection,
      eventPublisher,
      createEventSubscriber,
      cardCollectionSaga,
    };
  }

  private static createSharedServices(
    configService: EnvironmentConfigService,
    repositories: Repositories,
  ): SharedServices {
    const useMockAuth = process.env.USE_MOCK_AUTH === 'true';

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
          // For workers, we don't need OAuth client, just pass null
          null as any,
          appPasswordSessionService,
        );

    const metadataService = new IFramelyMetadataService(
      configService.getIFramelyApiKey(),
    );

    // Profile Service
    const profileService = useMockAuth
      ? new FakeBlueskyProfileService()
      : new BlueskyProfileService(atProtoAgentService);

    // Feed Service
    const feedService = new FeedService(repositories.feedRepository);

    return {
      tokenService,
      userAuthService,
      atProtoAgentService,
      metadataService,
      profileService,
      feedService,
    };
  }
}
