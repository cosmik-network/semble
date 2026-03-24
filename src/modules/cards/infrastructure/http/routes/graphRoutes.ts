import { Router } from 'express';
import { GetGraphDataController } from '../controllers/GetGraphDataController';
import { GetUserGraphDataController } from '../controllers/GetUserGraphDataController';
import { GetUrlGraphDataController } from '../controllers/GetUrlGraphDataController';
import { AuthMiddleware } from 'src/shared/infrastructure/http/middleware';

export function createGraphRoutes(
  authMiddleware: AuthMiddleware,
  getGraphDataController: GetGraphDataController,
  getUserGraphDataController: GetUserGraphDataController,
  getUrlGraphDataController: GetUrlGraphDataController,
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

  // GET /api/graph/url - Get URL-scoped sub-graph with depth-based traversal
  router.get('/url', authMiddleware.optionalAuth(), (req, res) =>
    getUrlGraphDataController.execute(req, res),
  );

  return router;
}
