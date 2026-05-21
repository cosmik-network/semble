import { IRouter } from 'express';
import { GetGraphDataController } from '../controllers/GetGraphDataController';
import { GetUserGraphDataController } from '../controllers/GetUserGraphDataController';
import { GetUrlGraphDataController } from '../controllers/GetUrlGraphDataController';
import { AuthMiddleware } from 'src/shared/infrastructure/http/middleware';
import { routes } from '@semble/types';

export function registerGraphRoutes(
  app: IRouter,
  authMiddleware: AuthMiddleware,
  getGraphDataController: GetGraphDataController,
  getUserGraphDataController: GetUserGraphDataController,
  getUrlGraphDataController: GetUrlGraphDataController,
): void {
  app.get(
    routes.graph.graphData.path,
    authMiddleware.optionalAuth(),
    (req, res) => getGraphDataController.execute(req, res),
  );

  app.get(
    routes.graph.userGraphData.path,
    authMiddleware.optionalAuth(),
    (req, res) => getUserGraphDataController.execute(req, res),
  );

  app.get(
    routes.graph.urlGraphData.path,
    authMiddleware.optionalAuth(),
    (req, res) => getUrlGraphDataController.execute(req, res),
  );
}
