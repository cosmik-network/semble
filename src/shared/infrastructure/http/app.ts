import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Router } from 'express';
import * as Sentry from '@sentry/node';
import { createUserRoutes } from '../../../modules/user/infrastructure/http/routes/userRoutes';
import { createAtprotoRoutes } from '../../../modules/atproto/infrastructure/atprotoRoutes';
import { createCardsModuleRoutes } from '../../../modules/cards/infrastructure/http/routes';
import { createConnectionRoutes } from '../../../modules/cards/infrastructure/http/routes/connectionRoutes';
import { createGraphRoutes } from '../../../modules/cards/infrastructure/http/routes/graphRoutes';
import { createFeedRoutes } from '../../../modules/feeds/infrastructure/http/routes/feedRoutes';
import { createSearchRoutes } from '../../../modules/search/infrastructure/http/routes/searchRoutes';
import { createNotificationRoutes } from '../../../modules/notifications/infrastructure/http/routes/notificationRoutes';
import { createTestRoutes } from './routes/testRoutes';
import {
  EnvironmentConfigService,
  Environment,
} from '../config/EnvironmentConfigService';
import { RepositoryFactory } from './factories/RepositoryFactory';
import { ServiceFactory } from './factories/ServiceFactory';
import { UseCaseFactory } from './factories/UseCaseFactory';
import { ControllerFactory } from './factories/ControllerFactory';

export const createExpressApp = (
  configService: EnvironmentConfigService,
): Express => {
  const app = express();

  // Determine allowed origins based on environment
  const getAllowedOrigins = () => {
    const environment = configService.get().environment;
    const appUrl = configService.getAppConfig().appUrl;

    switch (environment) {
      case Environment.PROD:
        return ['https://semble.so', 'https://api.semble.so'];
      case Environment.DEV:
        return ['https://dev.semble.so', 'https://api.dev.semble.so'];
      case Environment.LOCAL:
      default:
        // Allow both localhost:4000 and configured appUrl for flexibility
        return [
          'http://localhost:4000',
          'http://127.0.0.1:4000',
          appUrl,
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ];
    }
  };

  app.use(
    cors({
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true, // Required for cookies to work in cross-origin requests
    }),
  );

  // Middleware setup
  app.use(cookieParser()); // Parse cookies from incoming requests
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Create all dependencies using factories
  const repositories = RepositoryFactory.create(configService);
  const services = ServiceFactory.createForWebApp(configService, repositories);
  const useCases = UseCaseFactory.createForWebApp(repositories, services);

  // Construct serviceDid for XRPC
  const baseUrl = configService.getAtProtoConfig().baseUrl;
  const serviceDid = `did:web:${baseUrl.replace(/^https?:\/\//, '')}`;

  const controllers = ControllerFactory.create(
    useCases,
    services.cookieService,
    services,
    repositories,
    configService.getAppConfig().appUrl,
    serviceDid,
  );

  // Routes
  const userRouter = Router();
  const atprotoRouter = Router();

  createUserRoutes(
    userRouter,
    services.authMiddleware,
    controllers.initiateOAuthSignInController,
    controllers.completeOAuthSignInController,
    controllers.loginWithAppPasswordController,
    controllers.logoutController,
    controllers.getMyProfileController,
    controllers.getUserProfileController,
    controllers.refreshAccessTokenController,
    controllers.generateExtensionTokensController,
    controllers.followTargetController,
    controllers.unfollowTargetController,
    controllers.getFollowingUsersController,
    controllers.getFollowersController,
    controllers.getFollowingCollectionsController,
    controllers.getFollowingCountController,
    controllers.getFollowersCountController,
    controllers.getFollowingCollectionsCountController,
  );

  createAtprotoRoutes(atprotoRouter, services.nodeOauthClient);

  const cardsRouter = createCardsModuleRoutes(
    services.authMiddleware,
    // Card controllers
    controllers.addUrlToLibraryController,
    controllers.addCardToLibraryController,
    controllers.addCardToCollectionController,
    controllers.updateNoteCardController,
    controllers.updateUrlCardAssociationsController,
    controllers.removeCardFromLibraryController,
    controllers.removeCardFromCollectionController,
    controllers.getUrlMetadataController,
    controllers.getUrlCardViewController,
    controllers.getLibrariesForCardController,
    controllers.getMyUrlCardsController,
    controllers.getUserUrlCardsController,
    controllers.getUrlStatusForMyLibraryController,
    controllers.getLibrariesForUrlController,
    controllers.getNoteCardsForUrlController,
    controllers.searchUrlsController,
    // Collection controllers
    controllers.createCollectionController,
    controllers.updateCollectionController,
    controllers.deleteCollectionController,
    controllers.getCollectionPageController,
    controllers.getCollectionPageByAtUriController,
    controllers.getMyCollectionsController,
    controllers.getCollectionsController,
    controllers.getCollectionsForUrlController,
    controllers.searchCollectionsController,
    controllers.getOpenCollectionsWithContributorController,
    controllers.getCollectionFollowersController,
    controllers.getCollectionFollowersCountController,
    controllers.getCollectionContributorsController,
  );

  const connectionRouter = createConnectionRoutes(
    services.authMiddleware,
    controllers.createConnectionController,
    controllers.updateConnectionController,
    controllers.deleteConnectionController,
    controllers.getConnectionsController,
    controllers.getConnectionsForUrlController,
  );

  const graphRouter = createGraphRoutes(
    services.authMiddleware,
    controllers.getGraphDataController,
    controllers.getUserGraphDataController,
    controllers.getUrlGraphDataController,
  );

  const feedRouter = createFeedRoutes(
    services.authMiddleware,
    controllers.getGlobalFeedController,
    controllers.getGemActivityFeedController,
    controllers.getFollowingFeedController,
  );

  const searchRouter = createSearchRoutes(
    services.authMiddleware,
    controllers.getSimilarUrlsForUrlController,
    controllers.searchBskyPostsForUrlController,
    controllers.semanticSearchUrlsController,
    controllers.searchAtProtoAccountsController,
    controllers.searchLeafletDocsForUrlController,
  );

  const notificationRouter = createNotificationRoutes(
    services.authMiddleware,
    controllers.getMyNotificationsController,
    controllers.getUnreadNotificationCountController,
    controllers.markNotificationsAsReadController,
    controllers.markAllNotificationsAsReadController,
  );

  const testRouter = Router();
  createTestRoutes(testRouter);

  // DID Web endpoint
  app.get('/.well-known/did.json', (req, res) => {
    return res.json({
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: serviceDid,
      service: [
        {
          id: '#mention_search',
          type: 'MentionSearchService',
          serviceEndpoint: `https://${baseUrl.replace(/^https?:\/\//, '')}`,
        },
      ],
    });
  });

  // XRPC mention search endpoint
  app.get('/xrpc/parts.page.mention.search', (req, res) => {
    console.log('Received XRPC mention search request with query:', req.query);
    return controllers.xrpcMentionSearchController.execute(req, res);
  });

  // Register routes
  app.use('/api/users', userRouter);
  app.use('/atproto', atprotoRouter);
  app.use('/api', cardsRouter);
  app.use('/api/connections', connectionRouter);
  app.use('/api/graph', graphRouter);
  app.use('/api/feeds', feedRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/test', testRouter);

  // Sentry error handler - must be after all routes and before other error middleware
  Sentry.setupExpressErrorHandler(app);

  return app;
};
