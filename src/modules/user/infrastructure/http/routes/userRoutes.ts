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
import { ExchangeAuthCodeController } from '../controllers/ExchangeAuthCodeController';
import { FollowTargetController } from '../controllers/FollowTargetController';
import { UnfollowTargetController } from '../controllers/UnfollowTargetController';
import { GetFollowingUsersController } from '../controllers/GetFollowingUsersController';
import { GetFollowersController } from '../controllers/GetFollowersController';
import { GetFollowingCollectionsController } from '../controllers/GetFollowingCollectionsController';
import { GetFollowingCountController } from '../controllers/GetFollowingCountController';
import { GetFollowersCountController } from '../controllers/GetFollowersCountController';
import { GetFollowingCollectionsCountController } from '../controllers/GetFollowingCollectionsCountController';
import { ListApiKeysController } from '../controllers/ListApiKeysController';
import { CreateApiKeyController } from '../controllers/CreateApiKeyController';
import { UpdateApiKeyController } from '../controllers/UpdateApiKeyController';
import { RevokeApiKeyController } from '../controllers/RevokeApiKeyController';
import { routes } from '@semble/types';
import { usersContract, graphContract } from '@semble/contract';
import {
  validateBody,
  validateQuery,
} from '../../../../../shared/infrastructure/http/middleware/validateContract';

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
  listApiKeysController: ListApiKeysController,
  createApiKeyController: CreateApiKeyController,
  updateApiKeyController: UpdateApiKeyController,
  revokeApiKeyController: RevokeApiKeyController,
  exchangeAuthCodeController: ExchangeAuthCodeController,
): void {
  app.get(
    routes.users.initiateOAuth.path,
    validateQuery(usersContract.initiateOAuth.query),
    (req, res) => initiateOAuthSignInController.execute(req, res),
  );

  app.get(
    routes.users.oauthCallback.path,
    validateQuery(usersContract.oauthCallback.query),
    (req, res) => completeOAuthSignInController.execute(req, res),
  );

  app.post(
    routes.users.loginWithAppPassword.path,
    validateBody(usersContract.loginWithAppPassword.body),
    (req, res) => loginWithAppPasswordController.execute(req, res),
  );

  app.post(routes.users.logout.path, (req, res) =>
    logoutController.execute(req, res),
  );

  app.post(
    routes.users.refreshToken.path,
    validateBody(usersContract.refreshToken.body),
    (req, res) => refreshAccessTokenController.execute(req, res),
  );

  app.post(
    routes.users.exchangeToken.path,
    validateBody(usersContract.exchangeToken.body),
    (req, res) => exchangeAuthCodeController.execute(req, res),
  );

  app.get(
    routes.users.myProfile.path,
    authMiddleware.ensureAuthenticated(),
    validateQuery(usersContract.myProfile.query),
    (req, res) => getMyProfileController.execute(req, res),
  );

  app.get(
    routes.users.extensionTokens.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => generateExtensionTokensController.execute(req, res),
  );

  app.post(
    routes.graph.followTarget.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(graphContract.followTarget.body),
    (req, res) => followTargetController.execute(req, res),
  );

  app.post(
    routes.graph.unfollowTarget.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(graphContract.unfollowTarget.body),
    (req, res) => unfollowTargetController.execute(req, res),
  );

  app.get(
    routes.graph.followingUsers.path,
    authMiddleware.optionalAuth(),
    validateQuery(graphContract.followingUsers.query),
    (req, res) => getFollowingUsersController.execute(req, res),
  );

  app.get(
    routes.graph.followers.path,
    authMiddleware.optionalAuth(),
    validateQuery(graphContract.userFollowers.query),
    (req, res) => getFollowersController.execute(req, res),
  );

  app.get(
    routes.graph.followingCollections.path,
    authMiddleware.optionalAuth(),
    validateQuery(graphContract.followingCollections.query),
    (req, res) => getFollowingCollectionsController.execute(req, res),
  );

  app.get(
    routes.graph.followingCount.path,
    authMiddleware.optionalAuth(),
    validateQuery(graphContract.followingCount.query),
    (req, res) => getFollowingCountController.execute(req, res),
  );

  app.get(
    routes.graph.followersCount.path,
    authMiddleware.optionalAuth(),
    validateQuery(graphContract.userFollowersCount.query),
    (req, res) => getFollowersCountController.execute(req, res),
  );

  app.get(
    routes.graph.followingCollectionsCount.path,
    authMiddleware.optionalAuth(),
    validateQuery(graphContract.followingCollectionsCount.query),
    (req, res) => getFollowingCollectionsCountController.execute(req, res),
  );

  // API key management
  app.get(
    routes.apiKeys.listApiKeys.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => listApiKeysController.execute(req, res),
  );

  app.post(
    routes.apiKeys.createApiKey.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(usersContract.createApiKey.body),
    (req, res) => createApiKeyController.execute(req, res),
  );

  app.post(
    routes.apiKeys.updateApiKey.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(usersContract.updateApiKey.body),
    (req, res) => updateApiKeyController.execute(req, res),
  );

  app.post(
    routes.apiKeys.revokeApiKey.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(usersContract.revokeApiKey.body),
    (req, res) => revokeApiKeyController.execute(req, res),
  );

  // userProfile must be last: /:identifier would swallow /me, /login, /extension/tokens, etc.
  app.get(
    routes.users.userProfile.path,
    authMiddleware.optionalAuth(),
    validateQuery(usersContract.userProfile.query),
    (req, res) => getUserProfileController.execute(req, res),
  );
}
