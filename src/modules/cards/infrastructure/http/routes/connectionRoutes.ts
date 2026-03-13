import { Router } from 'express';
import { CreateConnectionController } from '../controllers/CreateConnectionController';
import { UpdateConnectionController } from '../controllers/UpdateConnectionController';
import { DeleteConnectionController } from '../controllers/DeleteConnectionController';
import { GetConnectionsController } from '../controllers/GetConnectionsController';
import { GetConnectionsForUrlController } from '../controllers/GetConnectionsForUrlController';
import { AuthMiddleware } from 'src/shared/infrastructure/http/middleware';

export function createConnectionRoutes(
  authMiddleware: AuthMiddleware,
  createConnectionController: CreateConnectionController,
  updateConnectionController: UpdateConnectionController,
  deleteConnectionController: DeleteConnectionController,
  getConnectionsController: GetConnectionsController,
  getConnectionsForUrlController: GetConnectionsForUrlController,
): Router {
  const router = Router();

  // Query routes
  // GET /api/connections/user/:identifier - Get all connections for a user (curator)
  router.get('/user/:identifier', authMiddleware.optionalAuth(), (req, res) =>
    getConnectionsController.execute(req, res),
  );

  // GET /api/connections/url - Get connections for a URL with optional direction filtering
  router.get('/url', authMiddleware.optionalAuth(), (req, res) =>
    getConnectionsForUrlController.execute(req, res),
  );

  // Command routes
  // POST /api/connections - Create connection
  router.post('/', authMiddleware.ensureAuthenticated(), (req, res) =>
    createConnectionController.execute(req, res),
  );

  // PUT /api/connections/:connectionId - Update connection
  router.put(
    '/:connectionId',
    authMiddleware.ensureAuthenticated(),
    (req, res) => updateConnectionController.execute(req, res),
  );

  // DELETE /api/connections/:connectionId - Delete connection
  router.delete(
    '/:connectionId',
    authMiddleware.ensureAuthenticated(),
    (req, res) => deleteConnectionController.execute(req, res),
  );

  return router;
}
