import { IRouter } from 'express';
import { CreateCollectionController } from '../controllers/CreateCollectionController';
import { UpdateCollectionController } from '../controllers/UpdateCollectionController';
import { DeleteCollectionController } from '../controllers/DeleteCollectionController';
import { GetCollectionPageController } from '../controllers/GetCollectionPageController';
import { GetMyCollectionsController } from '../controllers/GetMyCollectionsController';
import { GetUserCollectionsController } from '../controllers/GetUserCollectionsController';
import { GetCollectionPageByAtUriController } from '../controllers/GetCollectionPageByAtUriController';
import { GetCollectionsForUrlController } from '../controllers/GetCollectionsForUrlController';
import { SearchCollectionsController } from '../controllers/SearchCollectionsController';
import { GetOpenCollectionsWithContributorController } from '../controllers/GetOpenCollectionsWithContributorController';
import { GetCollectionFollowersController } from '../controllers/GetCollectionFollowersController';
import { GetCollectionFollowersCountController } from '../controllers/GetCollectionFollowersCountController';
import { GetCollectionContributorsController } from '../controllers/GetCollectionContributorsController';
import { AuthMiddleware } from 'src/shared/infrastructure/http/middleware';
import { routes } from '@semble/types';
import { collectionsContract } from '@semble/contract';
import {
  validateBody,
  validateQuery,
} from 'src/shared/infrastructure/http/middleware/validateContract';

export function registerCollectionRoutes(
  app: IRouter,
  authMiddleware: AuthMiddleware,
  createCollectionController: CreateCollectionController,
  updateCollectionController: UpdateCollectionController,
  deleteCollectionController: DeleteCollectionController,
  getCollectionPageController: GetCollectionPageController,
  getMyCollectionsController: GetMyCollectionsController,
  getUserCollectionsController: GetUserCollectionsController,
  getCollectionPageByAtUriController: GetCollectionPageByAtUriController,
  getCollectionsForUrlController: GetCollectionsForUrlController,
  searchCollectionsController: SearchCollectionsController,
  getOpenCollectionsWithContributorController: GetOpenCollectionsWithContributorController,
  getCollectionFollowersController: GetCollectionFollowersController,
  getCollectionFollowersCountController: GetCollectionFollowersCountController,
  getCollectionContributorsController: GetCollectionContributorsController,
): void {
  app.get(
    routes.collections.myCollections.path,
    authMiddleware.ensureAuthenticated(),
    validateQuery(collectionsContract.myCollections.query),
    (req, res) => getMyCollectionsController.execute(req, res),
  );

  app.get(
    routes.collections.searchCollections.path,
    authMiddleware.optionalAuth(),
    validateQuery(collectionsContract.searchCollections.query),
    (req, res) => searchCollectionsController.execute(req, res),
  );

  app.get(
    routes.collections.collectionsForUrl.path,
    authMiddleware.optionalAuth(),
    validateQuery(collectionsContract.collectionsForUrl.query),
    (req, res) => getCollectionsForUrlController.execute(req, res),
  );

  app.get(
    routes.collections.collectionsByUser.path,
    authMiddleware.optionalAuth(),
    validateQuery(collectionsContract.collectionsByUser.query),
    (req, res) => getUserCollectionsController.execute(req, res),
  );

  app.get(
    routes.collections.openWithContributor.path,
    authMiddleware.optionalAuth(),
    validateQuery(collectionsContract.openWithContributor.query),
    (req, res) => getOpenCollectionsWithContributorController.execute(req, res),
  );

  app.get(
    routes.collections.collectionByAtUri.path,
    authMiddleware.optionalAuth(),
    validateQuery(collectionsContract.collectionByAtUri.query),
    (req, res) => getCollectionPageByAtUriController.execute(req, res),
  );

  app.get(
    routes.collections.followersCount.path,
    authMiddleware.optionalAuth(),
    validateQuery(collectionsContract.collectionFollowersCount.query),
    (req, res) => getCollectionFollowersCountController.execute(req, res),
  );

  app.get(
    routes.collections.followers.path,
    authMiddleware.optionalAuth(),
    validateQuery(collectionsContract.collectionFollowers.query),
    (req, res) => getCollectionFollowersController.execute(req, res),
  );

  app.get(
    routes.collections.contributors.path,
    authMiddleware.optionalAuth(),
    validateQuery(collectionsContract.collectionContributors.query),
    (req, res) => getCollectionContributorsController.execute(req, res),
  );

  app.get(
    routes.collections.collectionById.path,
    authMiddleware.optionalAuth(),
    validateQuery(collectionsContract.collectionById.query),
    (req, res) => getCollectionPageController.execute(req, res),
  );

  app.post(
    routes.collections.createCollection.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(collectionsContract.createCollection.body),
    (req, res) => createCollectionController.execute(req, res),
  );

  app.post(
    routes.collections.updateCollection.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(collectionsContract.updateCollection.body),
    (req, res) => updateCollectionController.execute(req, res),
  );

  app.post(
    routes.collections.deleteCollection.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(collectionsContract.deleteCollection.body),
    (req, res) => deleteCollectionController.execute(req, res),
  );
}
