import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Router } from 'express';
import * as Sentry from '@sentry/node';
import { openApiDocument } from './openapi';
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

  // AtProto routes (mounted as sub-router — not REST API endpoints)
  const atprotoRouter = Router();
  createAtprotoRoutes(atprotoRouter, services.nodeOauthClient);
  app.use('/atproto', atprotoRouter);

  // OpenAPI spec and Scalar docs — public, no auth required
  app.get('/api/openapi.json', (req, res) => res.json(openApiDocument));
  app.get('/api/docs', (req, res) => {
    const baseUrl = configService.getAtProtoConfig().baseUrl;
    const specUrl = `${baseUrl}/api/openapi.json`;
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!doctype html>
<html>
  <head>
    <title>Semble API Docs</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script
      id="api-reference"
      data-url="${specUrl}"
      data-configuration='{"authentication":{"preferredSecurityScheme":"apiKey"}}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`);
  });

  // Test and stats routes — mounted before /api router to avoid prefix shadowing
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

  // /api router — strict CORS with credentials (internal frontend use)
  const apiRouter = Router();
  apiRouter.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOriginsSet.has(origin)) {
          callback(null, origin || true);
        } else {
          callback(new Error(`Origin ${origin} not allowed`));
        }
      },
      credentials: true,
      methods: allowedMethods,
    }),
  );

  // /xrpc router — open CORS, no credentials (public API access)
  const xrpcRouter = Router();
  xrpcRouter.use(
    cors({
      origin: '*',
      credentials: false,
      methods: allowedMethods,
    }),
  );

  // XRPC mention search endpoint (AT Protocol interop — public, xrpc only)
  xrpcRouter.get('/parts.page.mention.search', (req, res) => {
    console.log('Received XRPC mention search request with query:', req.query);
    return controllers.pagePartsSearchController.execute(req, res);
  });

  const registerAllRoutes = (router: Router) => {
    registerUserRoutes(
      router,
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
      router,
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
      router,
      services.authMiddleware,
      controllers.createConnectionController,
      controllers.updateConnectionController,
      controllers.deleteConnectionController,
      controllers.getConnectionsController,
      controllers.getConnectionsForUrlController,
    );

    registerGraphRoutes(
      router,
      services.authMiddleware,
      controllers.getGraphDataController,
      controllers.getUserGraphDataController,
      controllers.getUrlGraphDataController,
    );

    registerFeedRoutes(
      router,
      services.authMiddleware,
      controllers.getGlobalFeedController,
      controllers.getGemActivityFeedController,
      controllers.getFollowingFeedController,
    );

    registerSearchRoutes(
      router,
      services.authMiddleware,
      controllers.getSimilarUrlsForUrlController,
      controllers.searchBskyPostsForUrlController,
      controllers.semanticSearchUrlsController,
      controllers.searchAtProtoAccountsController,
      controllers.searchLeafletDocsForUrlController,
    );

    registerNotificationRoutes(
      router,
      services.authMiddleware,
      controllers.getMyNotificationsController,
      controllers.getUnreadNotificationCountController,
      controllers.markNotificationsAsReadController,
      controllers.markAllNotificationsAsReadController,
    );
  };

  registerAllRoutes(apiRouter);
  registerAllRoutes(xrpcRouter);

  app.use('/api', apiRouter);
  app.use('/xrpc', xrpcRouter);

  // Sentry error handler - must be after all routes and before other error middleware
  Sentry.setupExpressErrorHandler(app);

  return app;
};
