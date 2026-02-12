import { Router } from 'express';
import { InitiateOAuthSignInController } from '../controllers/InitiateOAuthSignInController';
import { CompleteOAuthSignInController } from '../controllers/CompleteOAuthSignInController';
import { LoginWithAppPasswordController } from '../controllers/LoginWithAppPasswordController';
import { RefreshAccessTokenController } from '../controllers/RefreshAccessTokenController';
import { AuthMiddleware } from '../../../../../shared/infrastructure/http/middleware/AuthMiddleware';
import { GetMyProfileController } from 'src/modules/cards/infrastructure/http/controllers/GetMyProfileController';
import { GetUserProfileController } from 'src/modules/cards/infrastructure/http/controllers/GetUserProfileController';
import { LogoutController } from '../controllers/LogoutController';
import { GenerateExtensionTokensController } from '../controllers/GenerateExtensionTokensController';
import { FollowTargetController } from '../controllers/FollowTargetController';
import { UnfollowTargetController } from '../controllers/UnfollowTargetController';
import { GetFollowingUsersController } from '../controllers/GetFollowingUsersController';
import { GetFollowersController } from '../controllers/GetFollowersController';
import { GetFollowingCollectionsController } from '../controllers/GetFollowingCollectionsController';
import { GetFollowingCountController } from '../controllers/GetFollowingCountController';
import { GetFollowersCountController } from '../controllers/GetFollowersCountController';
import { GetFollowingCollectionsCountController } from '../controllers/GetFollowingCollectionsCountController';

export const createUserRoutes = (
  router: Router,
  authMiddleware: AuthMiddleware,
  initiateOAuthSignInController: InitiateOAuthSignInController,
  completeOAuthSignInController: CompleteOAuthSignInController,
  loginWithAppPasswordController: LoginWithAppPasswordController,
  logoutController: LogoutController,
  getMyProfileController: GetMyProfileController,
  getUserProfileController: GetUserProfileController,
  refreshAccessTokenController: RefreshAccessTokenController,
  generateExtensionTokensController: GenerateExtensionTokensController,
  followTargetController: FollowTargetController,
  unfollowTargetController: UnfollowTargetController,
  getFollowingUsersController: GetFollowingUsersController,
  getFollowersController: GetFollowersController,
  getFollowingCollectionsController: GetFollowingCollectionsController,
  getFollowingCountController: GetFollowingCountController,
  getFollowersCountController: GetFollowersCountController,
  getFollowingCollectionsCountController: GetFollowingCollectionsCountController,
) => {
  // Public routes
  router.get('/login', (req, res) =>
    initiateOAuthSignInController.execute(req, res),
  );
  router.get('/oauth/callback', (req, res) =>
    completeOAuthSignInController.execute(req, res),
  );
  router.post('/login/app-password', (req, res) =>
    loginWithAppPasswordController.execute(req, res),
  );
  router.post('/logout', (req, res) => logoutController.execute(req, res));
  router.post('/oauth/refresh', (req, res) =>
    refreshAccessTokenController.execute(req, res),
  );

  // Protected routes
  router.get('/me', authMiddleware.ensureAuthenticated(), (req, res) =>
    getMyProfileController.execute(req, res),
  );

  // Public routes
  router.get('/:identifier', authMiddleware.optionalAuth(), (req, res) =>
    getUserProfileController.execute(req, res),
  );

  router.get(
    '/extension/tokens',
    authMiddleware.ensureAuthenticated(),
    (req, res) => generateExtensionTokensController.execute(req, res),
  );

  // Follow/Unfollow routes
  router.post('/follows', authMiddleware.ensureAuthenticated(), (req, res) =>
    followTargetController.execute(req, res),
  );

  router.delete(
    '/follows/:targetId/:targetType',
    authMiddleware.ensureAuthenticated(),
    (req, res) => unfollowTargetController.execute(req, res),
  );

  // Following/Followers query routes (public with optional auth)
  router.get(
    '/:identifier/following',
    authMiddleware.optionalAuth(),
    (req, res) => getFollowingUsersController.execute(req, res),
  );

  router.get(
    '/:identifier/followers',
    authMiddleware.optionalAuth(),
    (req, res) => getFollowersController.execute(req, res),
  );

  router.get(
    '/:identifier/following-collections',
    authMiddleware.optionalAuth(),
    (req, res) => getFollowingCollectionsController.execute(req, res),
  );

  // Following/Followers count routes (public)
  router.get(
    '/:identifier/following/count',
    authMiddleware.optionalAuth(),
    (req, res) => getFollowingCountController.execute(req, res),
  );

  router.get(
    '/:identifier/followers/count',
    authMiddleware.optionalAuth(),
    (req, res) => getFollowersCountController.execute(req, res),
  );

  router.get(
    '/:identifier/following-collections/count',
    authMiddleware.optionalAuth(),
    (req, res) => getFollowingCollectionsCountController.execute(req, res),
  );

  return router;
};
