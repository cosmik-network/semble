import { IRouter } from 'express';
import { GetGraphDataController } from '../controllers/GetGraphDataController';
import { GetUserGraphDataController } from '../controllers/GetUserGraphDataController';
import { GetUrlGraphDataController } from '../controllers/GetUrlGraphDataController';
import { SubscribeToTargetController } from '../../../../user/infrastructure/http/controllers/SubscribeToTargetController';
import { UnsubscribeFromTargetController } from '../../../../user/infrastructure/http/controllers/UnsubscribeFromTargetController';
import { UpdateSubscriptionController } from '../../../../user/infrastructure/http/controllers/UpdateSubscriptionController';
import { GetMySubscriptionsController } from '../../../../user/infrastructure/http/controllers/GetMySubscriptionsController';
import { AuthMiddleware } from 'src/shared/infrastructure/http/middleware';
import { routes } from '@semble/types';
import { graphContract } from '@semble/contract';
import {
  validateBody,
  validateQuery,
} from 'src/shared/infrastructure/http/middleware/validateContract';

export function registerGraphRoutes(
  app: IRouter,
  authMiddleware: AuthMiddleware,
  getGraphDataController: GetGraphDataController,
  getUserGraphDataController: GetUserGraphDataController,
  getUrlGraphDataController: GetUrlGraphDataController,
  subscribeToTargetController: SubscribeToTargetController,
  unsubscribeFromTargetController: UnsubscribeFromTargetController,
  updateSubscriptionController: UpdateSubscriptionController,
  getMySubscriptionsController: GetMySubscriptionsController,
): void {
  app.get(
    routes.graph.graphData.path,
    authMiddleware.optionalAuth(),
    validateQuery(graphContract.graphData.query),
    (req, res) => getGraphDataController.execute(req, res),
  );

  app.get(
    routes.graph.userGraphData.path,
    authMiddleware.optionalAuth(),
    validateQuery(graphContract.userGraphData.query),
    (req, res) => getUserGraphDataController.execute(req, res),
  );

  app.get(
    routes.graph.urlGraphData.path,
    authMiddleware.optionalAuth(),
    validateQuery(graphContract.urlGraphData.query),
    (req, res) => getUrlGraphDataController.execute(req, res),
  );

  app.post(
    routes.subscriptions.subscribeToTarget.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(graphContract.subscribeToTarget.body),
    (req, res) => subscribeToTargetController.execute(req, res),
  );

  app.post(
    routes.subscriptions.unsubscribeFromTarget.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(graphContract.unsubscribeFromTarget.body),
    (req, res) => unsubscribeFromTargetController.execute(req, res),
  );

  app.post(
    routes.subscriptions.updateSubscription.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(graphContract.updateSubscription.body),
    (req, res) => updateSubscriptionController.execute(req, res),
  );

  app.get(
    routes.subscriptions.getMySubscriptions.path,
    authMiddleware.ensureAuthenticated(),
    validateQuery(graphContract.getMySubscriptions.query),
    (req, res) => getMySubscriptionsController.execute(req, res),
  );
}
