import { IRouter } from 'express';
import { AuthMiddleware } from 'src/shared/infrastructure/http/middleware';
import { routes } from '@semble/types';
import { canvasContract } from '@semble/contract';
import {
  validateBody,
  validateQuery,
} from 'src/shared/infrastructure/http/middleware/validateContract';
import { CanvasController } from '../controllers/CanvasController';

export function registerCanvasRoutes(
  app: IRouter,
  authMiddleware: AuthMiddleware,
  canvasController: CanvasController,
): void {
  app.post(
    routes.canvases.create.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(canvasContract.create.body),
    (req, res) => canvasController.create(req, res),
  );

  app.get(
    routes.canvases.list.path,
    authMiddleware.ensureAuthenticated(),
    validateQuery(canvasContract.list.query),
    (req, res) => canvasController.list(req, res),
  );

  app.get(
    routes.canvases.get.path,
    authMiddleware.ensureAuthenticated(),
    validateQuery(canvasContract.get.query),
    (req, res) => canvasController.get(req, res),
  );

  app.post(
    routes.canvases.rename.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(canvasContract.rename.body),
    (req, res) => canvasController.rename(req, res),
  );

  app.post(
    routes.canvases.duplicate.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(canvasContract.duplicate.body),
    (req, res) => canvasController.duplicate(req, res),
  );

  app.post(
    routes.canvases.delete.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(canvasContract.delete.body),
    (req, res) => canvasController.delete(req, res),
  );

  app.get(
    routes.canvases.open.path,
    authMiddleware.ensureAuthenticated(),
    validateQuery(canvasContract.open.query),
    (req, res) => canvasController.open(req, res),
  );

  app.post(
    routes.canvases.save.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(canvasContract.save.body),
    (req, res) => canvasController.save(req, res),
  );

  app.post(
    routes.canvases.saveThumbnail.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(canvasContract.saveThumbnail.body),
    (req, res) => canvasController.saveThumbnail(req, res),
  );

  app.get(
    routes.canvases.getThumbnail.path,
    authMiddleware.ensureAuthenticated(),
    validateQuery(canvasContract.getThumbnail.query),
    (req, res) => canvasController.getThumbnail(req, res),
  );
}
