import { IRouter } from 'express';
import { GetGlobalFeedController } from '../controllers/GetGlobalFeedController';
import { GetGemActivityFeedController } from '../controllers/GetGemActivityFeedController';
import { GetFollowingFeedController } from '../controllers/GetFollowingFeedController';
import { AuthMiddleware } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { routes } from '@semble/types';
import { feedsContract } from '@semble/api';
import { validateQuery } from '../../../../../shared/infrastructure/http/middleware/validateContract';

export function registerFeedRoutes(
  app: IRouter,
  authMiddleware: AuthMiddleware,
  getGlobalFeedController: GetGlobalFeedController,
  getGemActivityFeedController: GetGemActivityFeedController,
  getFollowingFeedController: GetFollowingFeedController,
): void {
  app.get(
    routes.feeds.global.path,
    authMiddleware.optionalAuth(),
    validateQuery(feedsContract.globalFeed.query),
    (req, res) => getGlobalFeedController.execute(req, res),
  );

  app.get(
    routes.feeds.gem.path,
    authMiddleware.optionalAuth(),
    validateQuery(feedsContract.gemFeed.query),
    (req, res) => getGemActivityFeedController.execute(req, res),
  );

  app.get(
    routes.feeds.following.path,
    authMiddleware.optionalAuth(),
    validateQuery(feedsContract.followingFeed.query),
    (req, res) => getFollowingFeedController.execute(req, res),
  );
}
