import { Router } from 'express';
import { GetGlobalFeedController } from '../controllers/GetGlobalFeedController';
import { GetGemActivityFeedController } from '../controllers/GetGemActivityFeedController';
import { GetFollowingFeedController } from '../controllers/GetFollowingFeedController';
import { AuthMiddleware } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';

export function createFeedRoutes(
  authMiddleware: AuthMiddleware,
  getGlobalFeedController: GetGlobalFeedController,
  getGemActivityFeedController: GetGemActivityFeedController,
  getFollowingFeedController: GetFollowingFeedController,
): Router {
  const router = Router();

  // Apply authentication middleware to all feed routes
  router.use(authMiddleware.optionalAuth());

  // GET /api/feeds/global - Get global feed
  router.get('/global', (req, res) =>
    getGlobalFeedController.execute(req, res),
  );

  // GET /api/feeds/gem - Get gem activity feed (filtered for collections with 💎 and 2025)
  router.get('/gem', (req, res) =>
    getGemActivityFeedController.execute(req, res),
  );

  // GET /api/feeds/following - Get following feed (personalized feed from followed users)
  router.get('/following', (req, res) =>
    getFollowingFeedController.execute(req, res),
  );

  return router;
}
