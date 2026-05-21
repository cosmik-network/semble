import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Router } from 'express';
import * as Sentry from '@sentry/node';
import { registerUserRoutes } from '../../../modules/user/infrastructure/http/routes/userRoutes';
import { createStatsRoutes } from '../../../modules/user/infrastructure/http/routes/statsRoutes';
import { createAtprotoRoutes } from '../../../modules/atproto/infrastructure/atprotoRoutes';
import { registerCardsModuleRoutes } from '../../../modules/cards/infrastructure/http/routes';
import { registerConnectionRoutes } from '../../../modules/cards/infrastructure/http/routes/connectionRoutes';
import { registerGraphRoutes } from '../../../modules/cards/infrastructure/http/routes/graphRoutes';
import { registerFeedRoutes } from '../../../modules/feeds/infrastructure/http/routes/feedRoutes';
import { registerSearchRoutes } from '../../../modules/search/infrastructure/http/routes/searchRoutes';
import { registerNotificationRoutes } from '../../../modules/notifications/infrastructure/http/routes/notificationRoutes';
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
    const tunnel = configService.getTunnelConfig();

    switch (environment) {
      case Environment.PROD:
        return ['https://semble.so', 'https://api.semble.so'];
      case Environment.DEV:
        return ['https://dev.semble.so', 'https://api.dev.semble.so'];
      case Environment.LOCAL:
      default: {
        const origins = [
          'http://localhost:4000',
          'http://127.0.0.1:4000',
          appUrl,
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ];
        if (tunnel.enabled) {
          origins.push(tunnel.frontendUrl, tunnel.backendUrl);
        }
        return origins;
      }
    }
  };

  const environment = configService.get().environment;
  const allowedOrigins = getAllowedOrigins();
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
  const allowedOriginsSet = new Set(allowedOrigins);

  // PROD: strict allowlist only — no open-CORS fallback.
  // DEV/LOCAL: credentialed CORS for known origins, open wildcard for everyone else
  // so public read endpoints are callable from any third-party origin.
  // We use an origin callback rather than a custom middleware to avoid Fly.io's
  // proxy rewriting the Origin header and then stripping the reflected ACAO header.
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOriginsSet.has(origin)) {
          // No origin (server-to-server) or known origin: allow with credentials
          callback(null, origin || true);
        } else if (environment === Environment.PROD) {
          // Prod: reject unknown origins entirely
          callback(new Error(`Origin ${origin} not allowed`));
        } else {
          // DEV/LOCAL: allow unknown origins without credentials (open read access)
          callback(null, '*');
        }
      },
      credentials: true,
      methods: allowedMethods,
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

  // OAuth client metadata endpoint
  app.get('/oauth-client-metadata.json', (req, res) => {
    res.json(services.nodeOauthClient.clientMetadata);
  });

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
    return controllers.pagePartsSearchController.execute(req, res);
  });

  // Register API routes directly on app (full paths from routes object)
  registerUserRoutes(
    app,
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

  registerCardsModuleRoutes(
    app,
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

  registerConnectionRoutes(
    app,
    services.authMiddleware,
    controllers.createConnectionController,
    controllers.updateConnectionController,
    controllers.deleteConnectionController,
    controllers.getConnectionsController,
    controllers.getConnectionsForUrlController,
  );

  registerGraphRoutes(
    app,
    services.authMiddleware,
    controllers.getGraphDataController,
    controllers.getUserGraphDataController,
    controllers.getUrlGraphDataController,
  );

  registerFeedRoutes(
    app,
    services.authMiddleware,
    controllers.getGlobalFeedController,
    controllers.getGemActivityFeedController,
    controllers.getFollowingFeedController,
  );

  registerSearchRoutes(
    app,
    services.authMiddleware,
    controllers.getSimilarUrlsForUrlController,
    controllers.searchBskyPostsForUrlController,
    controllers.semanticSearchUrlsController,
    controllers.searchAtProtoAccountsController,
    controllers.searchLeafletDocsForUrlController,
  );

  registerNotificationRoutes(
    app,
    services.authMiddleware,
    controllers.getMyNotificationsController,
    controllers.getUnreadNotificationCountController,
    controllers.markNotificationsAsReadController,
    controllers.markAllNotificationsAsReadController,
  );

  // AtProto routes (mounted as sub-router — not REST API endpoints)
  const atprotoRouter = Router();
  createAtprotoRoutes(atprotoRouter, services.nodeOauthClient);
  app.use('/atproto', atprotoRouter);

  // Test and stats routes (internal — not in routes object)
  const testRouter = Router();
  createTestRoutes(testRouter);
  app.use('/api/test', testRouter);

  const statsRouter = Router();
  createStatsRoutes(
    statsRouter,
    services.statsApiKeyMiddleware,
    controllers.getUserStatsController,
  );
  app.use('/api/stats', statsRouter);

  // Sentry error handler - must be after all routes and before other error middleware
  Sentry.setupExpressErrorHandler(app);

  return app;
};
