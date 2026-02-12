import { Router } from 'express';
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
import { AuthMiddleware } from 'src/shared/infrastructure/http/middleware';

export function createCollectionRoutes(
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
): Router {
  const router = Router();

  // Query routes
  // GET /api/collections - Get my collections
  router.get('/', authMiddleware.ensureAuthenticated(), (req, res) =>
    getMyCollectionsController.execute(req, res),
  );

  // GET /api/collections/search - Search collections globally
  router.get('/search', authMiddleware.optionalAuth(), (req, res) =>
    searchCollectionsController.execute(req, res),
  );

  // GET /api/collections/url - Get collections for URL
  router.get('/url', authMiddleware.optionalAuth(), (req, res) =>
    getCollectionsForUrlController.execute(req, res),
  );

  // GET /api/collections/user/:identifier - Get user's collections by identifier
  router.get('/user/:identifier', authMiddleware.optionalAuth(), (req, res) =>
    getUserCollectionsController.execute(req, res),
  );

  // GET /api/collections/contributed/:identifier - Get open collections where user contributed
  router.get(
    '/contributed/:identifier',
    authMiddleware.optionalAuth(),
    (req, res) => getOpenCollectionsWithContributorController.execute(req, res),
  );

  // GET /api/collections/at/:handle/:recordKey - Get collection by AT URI
  router.get(
    '/at/:handle/:recordKey',
    authMiddleware.optionalAuth(),
    (req, res) => getCollectionPageByAtUriController.execute(req, res),
  );

  // GET /api/collections/:collectionId/followers - Get collection followers
  router.get(
    '/:collectionId/followers',
    authMiddleware.optionalAuth(),
    (req, res) => getCollectionFollowersController.execute(req, res),
  );

  // GET /api/collections/:collectionId/followers/count - Get collection followers count
  router.get(
    '/:collectionId/followers/count',
    authMiddleware.optionalAuth(),
    (req, res) => getCollectionFollowersCountController.execute(req, res),
  );

  // GET /api/collections/:collectionId - Get collection page
  router.get('/:collectionId', authMiddleware.optionalAuth(), (req, res) =>
    getCollectionPageController.execute(req, res),
  );

  // Command routes
  // POST /api/collections - Create a new collection
  router.post('/', authMiddleware.ensureAuthenticated(), (req, res) =>
    createCollectionController.execute(req, res),
  );

  // PUT /api/collections/:collectionId - Update collection details
  router.put(
    '/:collectionId',
    authMiddleware.ensureAuthenticated(),
    (req, res) => updateCollectionController.execute(req, res),
  );

  // DELETE /api/collections/:collectionId - Delete a collection
  router.delete(
    '/:collectionId',
    authMiddleware.ensureAuthenticated(),
    (req, res) => deleteCollectionController.execute(req, res),
  );

  return router;
}
