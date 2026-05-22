import { IRouter } from 'express';
import { CreateConnectionController } from '../controllers/CreateConnectionController';
import { UpdateConnectionController } from '../controllers/UpdateConnectionController';
import { DeleteConnectionController } from '../controllers/DeleteConnectionController';
import { GetConnectionsController } from '../controllers/GetConnectionsController';
import { GetConnectionsForUrlController } from '../controllers/GetConnectionsForUrlController';
import { AuthMiddleware } from 'src/shared/infrastructure/http/middleware';
import { routes } from '@semble/types';
import { connectionsContract } from '@semble/api';
import {
  validateBody,
  validateQuery,
} from 'src/shared/infrastructure/http/middleware/validateContract';

export function registerConnectionRoutes(
  app: IRouter,
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
    validateQuery(connectionsContract.connectionsByUser.query),
    (req, res) => getConnectionsController.execute(req, res),
  );

  app.get(
    routes.connections.connectionsForUrl.path,
    authMiddleware.optionalAuth(),
    validateQuery(connectionsContract.connectionsForUrl.query),
    (req, res) => getConnectionsForUrlController.execute(req, res),
  );

  app.post(
    routes.connections.createConnection.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(connectionsContract.createConnection.body),
    (req, res) => createConnectionController.execute(req, res),
  );

  app.put(
    routes.connections.updateConnection.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(connectionsContract.updateConnection.body),
    (req, res) => updateConnectionController.execute(req, res),
  );

  app.post(
    routes.connections.deleteConnection.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(connectionsContract.deleteConnection.body),
    (req, res) => deleteConnectionController.execute(req, res),
  );
}
