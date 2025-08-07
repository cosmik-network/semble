import { DatabaseFactory } from '../../database/DatabaseFactory';
import { EnvironmentConfigService } from '../../config/EnvironmentConfigService';
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

export interface Repositories {
  userRepository: IUserRepository;
  tokenRepository: ITokenRepository;
  cardRepository: ICardRepository;
  cardQueryRepository: ICardQueryRepository;
  collectionRepository: ICollectionRepository;
  collectionQueryRepository: ICollectionQueryRepository;
  appPasswordSessionRepository: IAppPasswordSessionRepository;
  feedRepository: IFeedRepository;
  oauthStateStore: NodeSavedStateStore;
  oauthSessionStore: NodeSavedSessionStore;
}

export class RepositoryFactory {
  static create(configService: EnvironmentConfigService): Repositories {
    const useMockRepos = process.env.USE_MOCK_REPOS === 'true';

    if (useMockRepos) {
      // Create in-memory repositories
      const userRepository = new InMemoryUserRepository();
      const tokenRepository = new InMemoryTokenRepository();
      const cardRepository = new InMemoryCardRepository();
      const collectionRepository = new InMemoryCollectionRepository();
      const cardQueryRepository = new InMemoryCardQueryRepository(
        cardRepository,
        collectionRepository,
      );
      const collectionQueryRepository = new InMemoryCollectionQueryRepository(
        collectionRepository,
      );
      const appPasswordSessionRepository =
        new InMemoryAppPasswordSessionRepository();
      const feedRepository = InMemoryFeedRepository.getInstance();
      const oauthStateStore = new InMemoryStateStore();
      const oauthSessionStore = new InMemorySessionStore();

      return {
        userRepository,
        tokenRepository,
        cardRepository,
        cardQueryRepository,
        collectionRepository,
        collectionQueryRepository,
        appPasswordSessionRepository,
        feedRepository,
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
      oauthStateStore,
      oauthSessionStore,
    };
  }
}
