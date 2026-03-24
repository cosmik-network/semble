import { Router } from 'express';
import { GetGraphDataController } from '../controllers/GetGraphDataController';
import { GetUserGraphDataController } from '../controllers/GetUserGraphDataController';
import { AuthMiddleware } from 'src/shared/infrastructure/http/middleware';

export function createGraphRoutes(
  authMiddleware: AuthMiddleware,
  getGraphDataController: GetGraphDataController,
  getUserGraphDataController: GetUserGraphDataController,
): Router {
  const router = Router();

  // Query routes
  // GET /api/graph/data - Get all nodes and edges for graph visualization
  router.get('/data', authMiddleware.optionalAuth(), (req, res) =>
    getGraphDataController.execute(req, res),
  );

  // GET /api/graph/user/:identifier - Get user-scoped graph data
  router.get('/user/:identifier', authMiddleware.optionalAuth(), (req, res) =>
    getUserGraphDataController.execute(req, res),
  );

  return router;
}
