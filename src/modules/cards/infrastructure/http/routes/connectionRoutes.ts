import { Express } from 'express';
import { CreateConnectionController } from '../controllers/CreateConnectionController';
import { UpdateConnectionController } from '../controllers/UpdateConnectionController';
import { DeleteConnectionController } from '../controllers/DeleteConnectionController';
import { GetConnectionsController } from '../controllers/GetConnectionsController';
import { GetConnectionsForUrlController } from '../controllers/GetConnectionsForUrlController';
import { AuthMiddleware } from 'src/shared/infrastructure/http/middleware';
import { routes } from '@semble/types';

export function registerConnectionRoutes(
  app: Express,
  authMiddleware: AuthMiddleware,
  createConnectionController: CreateConnectionController,
  updateConnectionController: UpdateConnectionController,
  deleteConnectionController: DeleteConnectionController,
  getConnectionsController: GetConnectionsController,
  getConnectionsForUrlController: GetConnectionsForUrlController,
): void {
  app.get(
    routes.connections.connectionsByUser.path,
    authMiddleware.optionalAuth(),
    (req, res) => getConnectionsController.execute(req, res),
  );

  app.get(
    routes.connections.connectionsForUrl.path,
    authMiddleware.optionalAuth(),
    (req, res) => getConnectionsForUrlController.execute(req, res),
  );

  app.post(
    routes.connections.createConnection.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => createConnectionController.execute(req, res),
  );

  app.put(
    routes.connections.updateConnection.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => updateConnectionController.execute(req, res),
  );

  app.delete(
    routes.connections.deleteConnection.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => deleteConnectionController.execute(req, res),
  );
}
