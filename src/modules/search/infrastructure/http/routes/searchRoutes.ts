import { IRouter } from 'express';
import { GetSimilarUrlsForUrlController } from '../controllers/GetSimilarUrlsForUrlController';
import { SearchBskyPostsForUrlController } from '../controllers/SearchBskyPostsForUrlController';
import { SemanticSearchUrlsController } from '../controllers/SemanticSearchUrlsController';
import { RecommendedCardsController } from '../controllers/RecommendedCardsController';
import { RecommendedUsersController } from '../../../../user/infrastructure/http/controllers/RecommendedUsersController';
import { RecommendedCollectionsController } from '../../../../cards/infrastructure/http/controllers/RecommendedCollectionsController';
import { SearchAtProtoAccountsController } from '../controllers/SearchAtProtoAccountsController';
import { SearchLeafletDocsForUrlController } from '../controllers/SearchLeafletDocsForUrlController';
import { AuthMiddleware } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { routes } from '@semble/types';
import { searchContract } from '@semble/contract';
import { validateQuery } from '../../../../../shared/infrastructure/http/middleware/validateContract';

export function registerSearchRoutes(
  app: IRouter,
  authMiddleware: AuthMiddleware,
  getSimilarUrlsForUrlController: GetSimilarUrlsForUrlController,
  searchBskyPostsForUrlController: SearchBskyPostsForUrlController,
  semanticSearchUrlsController: SemanticSearchUrlsController,
  searchAtProtoAccountsController: SearchAtProtoAccountsController,
  searchLeafletDocsForUrlController: SearchLeafletDocsForUrlController,
  recommendedCardsController: RecommendedCardsController,
  recommendedUsersController: RecommendedUsersController,
  recommendedCollectionsController: RecommendedCollectionsController,
): void {
  app.get(
    routes.search.similarUrls.path,
    authMiddleware.optionalAuth(),
    validateQuery(searchContract.similarUrls.query),
    (req, res) => getSimilarUrlsForUrlController.execute(req, res),
  );

  app.get(
    routes.search.bskyPosts.path,
    authMiddleware.optionalAuth(),
    validateQuery(searchContract.bskyPosts.query),
    (req, res) => searchBskyPostsForUrlController.execute(req, res),
  );

  app.get(
    routes.search.semantic.path,
    authMiddleware.optionalAuth(),
    validateQuery(searchContract.semantic.query),
    (req, res) => semanticSearchUrlsController.execute(req, res),
  );

  app.get(
    routes.search.atProtoAccounts.path,
    authMiddleware.optionalAuth(),
    validateQuery(searchContract.atProtoAccounts.query),
    (req, res) => searchAtProtoAccountsController.execute(req, res),
  );

  app.get(
    routes.search.leafletDocs.path,
    authMiddleware.optionalAuth(),
    validateQuery(searchContract.leafletDocs.query),
    (req, res) => searchLeafletDocsForUrlController.execute(req, res),
  );

  app.get(
    routes.search.recommended.path,
    authMiddleware.optionalAuth(),
    validateQuery(searchContract.recommended.query),
    (req, res) => recommendedCardsController.execute(req, res),
  );

  app.get(
    routes.search.recommendedUsers.path,
    authMiddleware.ensureAuthenticated(),
    validateQuery(searchContract.recommendedUsers.query),
    (req, res) => recommendedUsersController.execute(req, res),
  );

  app.get(
    routes.search.recommendedCollections.path,
    authMiddleware.ensureAuthenticated(),
    validateQuery(searchContract.recommendedCollections.query),
    (req, res) => recommendedCollectionsController.execute(req, res),
  );
}
