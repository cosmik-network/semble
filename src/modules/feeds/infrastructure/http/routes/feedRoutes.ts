import { Express } from 'express';
import { GetGlobalFeedController } from '../controllers/GetGlobalFeedController';
import { GetGemActivityFeedController } from '../controllers/GetGemActivityFeedController';
import { GetFollowingFeedController } from '../controllers/GetFollowingFeedController';
import { AuthMiddleware } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { routes } from '@semble/types';

export function registerFeedRoutes(
  app: Express,
  authMiddleware: AuthMiddleware,
  getGlobalFeedController: GetGlobalFeedController,
  getGemActivityFeedController: GetGemActivityFeedController,
  getFollowingFeedController: GetFollowingFeedController,
): void {
  app.get(routes.feeds.global.path, authMiddleware.optionalAuth(), (req, res) =>
    getGlobalFeedController.execute(req, res),
  );

  app.get(routes.feeds.gem.path, authMiddleware.optionalAuth(), (req, res) =>
    getGemActivityFeedController.execute(req, res),
  );

  app.get(
    routes.feeds.following.path,
    authMiddleware.optionalAuth(),
    (req, res) => getFollowingFeedController.execute(req, res),
  );
}
