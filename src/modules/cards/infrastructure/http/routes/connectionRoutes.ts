import { Router } from 'express';
import { CreateConnectionController } from '../controllers/CreateConnectionController';
import { UpdateConnectionController } from '../controllers/UpdateConnectionController';
import { DeleteConnectionController } from '../controllers/DeleteConnectionController';
import { GetConnectionsController } from '../controllers/GetConnectionsController';
import { GetForwardConnectionsForUrlController } from '../controllers/GetForwardConnectionsForUrlController';
import { GetBackwardConnectionsForUrlController } from '../controllers/GetBackwardConnectionsForUrlController';
import { AuthMiddleware } from 'src/shared/infrastructure/http/middleware';

export function createConnectionRoutes(
  authMiddleware: AuthMiddleware,
  createConnectionController: CreateConnectionController,
  updateConnectionController: UpdateConnectionController,
  deleteConnectionController: DeleteConnectionController,
  getConnectionsController: GetConnectionsController,
  getForwardConnectionsForUrlController: GetForwardConnectionsForUrlController,
  getBackwardConnectionsForUrlController: GetBackwardConnectionsForUrlController,
): Router {
  const router = Router();

  // Query routes
  // GET /api/connections/user/:identifier - Get all connections for a user (curator)
  router.get('/user/:identifier', authMiddleware.optionalAuth(), (req, res) =>
    getConnectionsController.execute(req, res),
  );

  // GET /api/connections/forward - Get forward connections for URL
  router.get('/forward', authMiddleware.optionalAuth(), (req, res) =>
    getForwardConnectionsForUrlController.execute(req, res),
  );

  // GET /api/connections/backward - Get backward connections for URL
  router.get('/backward', authMiddleware.optionalAuth(), (req, res) =>
    getBackwardConnectionsForUrlController.execute(req, res),
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
