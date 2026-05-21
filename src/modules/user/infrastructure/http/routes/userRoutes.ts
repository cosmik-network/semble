import { IRouter } from 'express';
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
import { routes } from '@semble/types';

export function registerUserRoutes(
  app: IRouter,
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
): void {
  app.get(routes.users.initiateOAuth.path, (req, res) =>
    initiateOAuthSignInController.execute(req, res),
  );

  app.get(routes.users.oauthCallback.path, (req, res) =>
    completeOAuthSignInController.execute(req, res),
  );

  app.post(routes.users.loginWithAppPassword.path, (req, res) =>
    loginWithAppPasswordController.execute(req, res),
  );

  app.post(routes.users.logout.path, (req, res) =>
    logoutController.execute(req, res),
  );

  app.post(routes.users.refreshToken.path, (req, res) =>
    refreshAccessTokenController.execute(req, res),
  );

  app.get(
    routes.users.myProfile.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => getMyProfileController.execute(req, res),
  );

  app.get(
    routes.users.extensionTokens.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => generateExtensionTokensController.execute(req, res),
  );

  app.post(
    routes.users.followTarget.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => followTargetController.execute(req, res),
  );

  app.delete(
    routes.users.unfollowTarget.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => unfollowTargetController.execute(req, res),
  );

  app.get(
    routes.users.followingUsers.path,
    authMiddleware.optionalAuth(),
    (req, res) => getFollowingUsersController.execute(req, res),
  );

  app.get(
    routes.users.followers.path,
    authMiddleware.optionalAuth(),
    (req, res) => getFollowersController.execute(req, res),
  );

  app.get(
    routes.users.followingCollections.path,
    authMiddleware.optionalAuth(),
    (req, res) => getFollowingCollectionsController.execute(req, res),
  );

  app.get(
    routes.users.followingCount.path,
    authMiddleware.optionalAuth(),
    (req, res) => getFollowingCountController.execute(req, res),
  );

  app.get(
    routes.users.followersCount.path,
    authMiddleware.optionalAuth(),
    (req, res) => getFollowersCountController.execute(req, res),
  );

  app.get(
    routes.users.followingCollectionsCount.path,
    authMiddleware.optionalAuth(),
    (req, res) => getFollowingCollectionsCountController.execute(req, res),
  );

  // userProfile must be last: /:identifier would swallow /me, /login, /extension/tokens, etc.
  app.get(
    routes.users.userProfile.path,
    authMiddleware.optionalAuth(),
    (req, res) => getUserProfileController.execute(req, res),
  );
}
