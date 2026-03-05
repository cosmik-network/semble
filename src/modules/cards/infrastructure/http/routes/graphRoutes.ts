import { Router } from 'express';
import { GetGraphDataController } from '../controllers/GetGraphDataController';
import { AuthMiddleware } from 'src/shared/infrastructure/http/middleware';

export function createGraphRoutes(
  authMiddleware: AuthMiddleware,
  getGraphDataController: GetGraphDataController,
): Router {
  const router = Router();

  // Query routes
  // GET /api/graph/data - Get all nodes and edges for graph visualization
  router.get('/data', authMiddleware.optionalAuth(), (req, res) =>
    getGraphDataController.execute(req, res),
  );

  return router;
}
