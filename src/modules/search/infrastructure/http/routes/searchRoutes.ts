import { Router } from 'express';
import { GetSimilarUrlsForUrlController } from '../controllers/GetSimilarUrlsForUrlController';
import { SearchBskyPostsForUrlController } from '../controllers/SearchBskyPostsForUrlController';
import { SemanticSearchUrlsController } from '../controllers/SemanticSearchUrlsController';
import { SearchAtProtoAccountsController } from '../controllers/SearchAtProtoAccountsController';
import { AuthMiddleware } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export function createSearchRoutes(
  authMiddleware: AuthMiddleware,
  getSimilarUrlsForUrlController: GetSimilarUrlsForUrlController,
  searchBskyPostsForUrlController: SearchBskyPostsForUrlController,
  semanticSearchUrlsController: SemanticSearchUrlsController,
  searchAtProtoAccountsController: SearchAtProtoAccountsController,
): Router {
  const router = Router();

  // GET /api/search/similar-urls - Get similar URLs for a given URL
  router.get('/similar-urls', authMiddleware.optionalAuth(), (req, res) =>
    getSimilarUrlsForUrlController.execute(req, res),
  );

  // GET /api/search/bsky-posts - Search Bluesky posts
  router.get('/bsky-posts', authMiddleware.optionalAuth(), (req, res) =>
    searchBskyPostsForUrlController.execute(req, res),
  );

  // GET /api/search/semantic - Semantic search for URLs
  router.get('/semantic', authMiddleware.optionalAuth(), (req, res) =>
    semanticSearchUrlsController.execute(req, res),
  );

  // GET /api/search/accounts - Search AtProto accounts
  router.get('/accounts', authMiddleware.optionalAuth(), (req, res) =>
    searchAtProtoAccountsController.execute(req, res),
  );

  return router;
}
