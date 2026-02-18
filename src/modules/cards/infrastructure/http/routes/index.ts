import { Router } from 'express';
import { createCardRoutes } from './cardRoutes';
import { createCollectionRoutes } from './collectionRoutes';
import { AddUrlToLibraryController } from '../controllers/AddUrlToLibraryController';
import { AddCardToLibraryController } from '../controllers/AddCardToLibraryController';
import { AddCardToCollectionController } from '../controllers/AddCardToCollectionController';
import { UpdateNoteCardController } from '../controllers/UpdateNoteCardController';
import { UpdateUrlCardAssociationsController } from '../controllers/UpdateUrlCardAssociationsController';
import { RemoveCardFromLibraryController } from '../controllers/RemoveCardFromLibraryController';
import { RemoveCardFromCollectionController } from '../controllers/RemoveCardFromCollectionController';
import { GetUrlMetadataController } from '../controllers/GetUrlMetadataController';
import { GetUrlCardViewController } from '../controllers/GetUrlCardViewController';
import { GetLibrariesForCardController } from '../controllers/GetLibrariesForCardController';
import { GetMyUrlCardsController } from '../controllers/GetMyUrlCardsController';
import { GetUserUrlCardsController } from '../controllers/GetUserUrlCardsController';
import { GetUrlStatusForMyLibraryController } from '../controllers/GetUrlStatusForMyLibraryController';
import { GetLibrariesForUrlController } from '../controllers/GetLibrariesForUrlController';
import { GetNoteCardsForUrlController } from '../controllers/GetNoteCardsForUrlController';
import { CreateCollectionController } from '../controllers/CreateCollectionController';
import { UpdateCollectionController } from '../controllers/UpdateCollectionController';
import { DeleteCollectionController } from '../controllers/DeleteCollectionController';
import { GetCollectionPageController } from '../controllers/GetCollectionPageController';
import { AuthMiddleware } from 'src/shared/infrastructure/http/middleware';
import { GetMyCollectionsController } from '../controllers/GetMyCollectionsController';
import { GetUserCollectionsController } from '../controllers/GetUserCollectionsController';
import { SearchCollectionsController } from '../controllers/SearchCollectionsController';
import { GetOpenCollectionsWithContributorController } from '../controllers/GetOpenCollectionsWithContributorController';
import { GetCollectionPageByAtUriController } from '../controllers/GetCollectionPageByAtUriController';
import { GetCollectionsForUrlController } from '../controllers/GetCollectionsForUrlController';
import { GetCollectionFollowersController } from '../controllers/GetCollectionFollowersController';
import { GetCollectionFollowersCountController } from '../controllers/GetCollectionFollowersCountController';

export function createCardsModuleRoutes(
  authMiddleware: AuthMiddleware,
  // Card controllers
  addUrlToLibraryController: AddUrlToLibraryController,
  addCardToLibraryController: AddCardToLibraryController,
  addCardToCollectionController: AddCardToCollectionController,
  updateNoteCardController: UpdateNoteCardController,
  updateUrlCardAssociationsController: UpdateUrlCardAssociationsController,
  removeCardFromLibraryController: RemoveCardFromLibraryController,
  removeCardFromCollectionController: RemoveCardFromCollectionController,
  getUrlMetadataController: GetUrlMetadataController,
  getUrlCardViewController: GetUrlCardViewController,
  getLibrariesForCardController: GetLibrariesForCardController,
  getMyUrlCardsController: GetMyUrlCardsController,
  getUserUrlCardsController: GetUserUrlCardsController,
  getUrlStatusForMyLibraryController: GetUrlStatusForMyLibraryController,
  getLibrariesForUrlController: GetLibrariesForUrlController,
  getNoteCardsForUrlController: GetNoteCardsForUrlController,
  // Collection controllers
  createCollectionController: CreateCollectionController,
  updateCollectionController: UpdateCollectionController,
  deleteCollectionController: DeleteCollectionController,
  getCollectionPageController: GetCollectionPageController,
  getCollectionPageByAtUriController: GetCollectionPageByAtUriController,
  getMyCollectionsController: GetMyCollectionsController,
  getCollectionsController: GetUserCollectionsController,
  getCollectionsForUrlController: GetCollectionsForUrlController,
  searchCollectionsController: SearchCollectionsController,
  getOpenCollectionsWithContributorController: GetOpenCollectionsWithContributorController,
  getCollectionFollowersController: GetCollectionFollowersController,
  getCollectionFollowersCountController: GetCollectionFollowersCountController,
): Router {
  const router = Router();

  // Mount card routes at /api/cards
  router.use(
    '/cards',
    createCardRoutes(
      authMiddleware,
      addUrlToLibraryController,
      addCardToLibraryController,
      addCardToCollectionController,
      updateNoteCardController,
      updateUrlCardAssociationsController,
      removeCardFromLibraryController,
      removeCardFromCollectionController,
      getUrlMetadataController,
      getUrlCardViewController,
      getLibrariesForCardController,
      getMyUrlCardsController,
      getUserUrlCardsController,
      getUrlStatusForMyLibraryController,
      getLibrariesForUrlController,
      getNoteCardsForUrlController,
    ),
  );

  // Mount collection routes at /api/collections
  router.use(
    '/collections',
    createCollectionRoutes(
      authMiddleware,
      createCollectionController,
      updateCollectionController,
      deleteCollectionController,
      getCollectionPageController,
      getMyCollectionsController,
      getCollectionsController,
      getCollectionPageByAtUriController,
      getCollectionsForUrlController,
      searchCollectionsController,
      getOpenCollectionsWithContributorController,
      getCollectionFollowersController,
      getCollectionFollowersCountController,
    ),
  );

  return router;
}
