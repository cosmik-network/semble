import { IRouter } from 'express';
import { AuthMiddleware } from 'src/shared/infrastructure/http/middleware';
import { routes } from '@semble/types';
import { tagsContract } from '@semble/contract';
import { validateQuery } from 'src/shared/infrastructure/http/middleware/validateContract';
import { GetTagsController } from '../controllers/GetTagsController';
import { GetTaggedItemsController } from '../controllers/GetTaggedItemsController';

export function registerTagRoutes(
  app: IRouter,
  authMiddleware: AuthMiddleware,
  getTagsController: GetTagsController,
  getTaggedItemsController: GetTaggedItemsController,
): void {
  app.get(
    routes.tags.getTags.path,
    authMiddleware.optionalAuth(),
    validateQuery(tagsContract.getTags.query),
    (req, res) => getTagsController.execute(req, res),
  );

  app.get(
    routes.tags.taggedItems.path,
    authMiddleware.optionalAuth(),
    validateQuery(tagsContract.taggedItems.query),
    (req, res) => getTaggedItemsController.execute(req, res),
  );
}
