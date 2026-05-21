import { Express } from 'express';
import { GetSimilarUrlsForUrlController } from '../controllers/GetSimilarUrlsForUrlController';
import { SearchBskyPostsForUrlController } from '../controllers/SearchBskyPostsForUrlController';
import { SemanticSearchUrlsController } from '../controllers/SemanticSearchUrlsController';
import { SearchAtProtoAccountsController } from '../controllers/SearchAtProtoAccountsController';
import { SearchLeafletDocsForUrlController } from '../controllers/SearchLeafletDocsForUrlController';
import { AuthMiddleware } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { routes } from '@semble/types';

export function registerSearchRoutes(
  app: Express,
  authMiddleware: AuthMiddleware,
  getSimilarUrlsForUrlController: GetSimilarUrlsForUrlController,
  searchBskyPostsForUrlController: SearchBskyPostsForUrlController,
  semanticSearchUrlsController: SemanticSearchUrlsController,
  searchAtProtoAccountsController: SearchAtProtoAccountsController,
  searchLeafletDocsForUrlController: SearchLeafletDocsForUrlController,
): void {
  app.get(
    routes.search.similarUrls.path,
    authMiddleware.optionalAuth(),
    (req, res) => getSimilarUrlsForUrlController.execute(req, res),
  );

  app.get(
    routes.search.bskyPosts.path,
    authMiddleware.optionalAuth(),
    (req, res) => searchBskyPostsForUrlController.execute(req, res),
  );

  app.get(
    routes.search.semantic.path,
    authMiddleware.optionalAuth(),
    (req, res) => semanticSearchUrlsController.execute(req, res),
  );

  app.get(
    routes.search.atProtoAccounts.path,
    authMiddleware.optionalAuth(),
    (req, res) => searchAtProtoAccountsController.execute(req, res),
  );

  app.get(
    routes.search.leafletDocs.path,
    authMiddleware.optionalAuth(),
    (req, res) => searchLeafletDocsForUrlController.execute(req, res),
  );
}
