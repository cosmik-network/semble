import { IRouter } from 'express';
import { registerCardRoutes } from './cardRoutes';
import { registerCollectionRoutes } from './collectionRoutes';
import { AddUrlToLibraryController } from '../controllers/AddUrlToLibraryController';
import { AddAnnotationToLibraryController } from '../controllers/AddAnnotationToLibraryController';
import { AddCardToLibraryController } from '../controllers/AddCardToLibraryController';
import { AddCardToCollectionController } from '../controllers/AddCardToCollectionController';
import { UpdateNoteCardController } from '../controllers/UpdateNoteCardController';
import { UpdateUrlCardAssociationsController } from '../controllers/UpdateUrlCardAssociationsController';
import { UpdateAnnotationAssociationsController } from '../controllers/UpdateAnnotationAssociationsController';
import { RemoveCardFromLibraryController } from '../controllers/RemoveCardFromLibraryController';
import { RemoveCardFromCollectionController } from '../controllers/RemoveCardFromCollectionController';
import { GetUrlMetadataController } from '../controllers/GetUrlMetadataController';
import { GetUrlCardViewController } from '../controllers/GetUrlCardViewController';
import { GetLibrariesForCardController } from '../controllers/GetLibrariesForCardController';
import { GetMyUrlCardsController } from '../controllers/GetMyUrlCardsController';
import { GetUserUrlCardsController } from '../controllers/GetUserUrlCardsController';
import { GetUrlStatusForMyLibraryController } from '../controllers/GetUrlStatusForMyLibraryController';
import { GetAnnotationStatusForMyLibraryController } from '../controllers/GetAnnotationStatusForMyLibraryController';
import { GetLibrariesForUrlController } from '../controllers/GetLibrariesForUrlController';
import { GetNoteCardsForUrlController } from '../controllers/GetNoteCardsForUrlController';
import { GetAnnotationsForUrlController } from '../controllers/GetAnnotationsForUrlController';
import { GetAnnotationController } from '../controllers/GetAnnotationController';
import { GetNotesForAnnotationController } from '../controllers/GetNotesForAnnotationController';
import { GetLibrariesForAnnotationController } from '../controllers/GetLibrariesForAnnotationController';
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
import { GetCollectionsForAnnotationController } from '../controllers/GetCollectionsForAnnotationController';
import { GetRecommendedCollectionsForUrlController } from '../controllers/GetRecommendedCollectionsForUrlController';
import { GetCollectionFollowersController } from '../controllers/GetCollectionFollowersController';
import { GetCollectionFollowersCountController } from '../controllers/GetCollectionFollowersCountController';
import { GetCollectionContributorsController } from '../controllers/GetCollectionContributorsController';
import { SearchUrlsController } from '../controllers/SearchUrlsController';
import { GetBatchUrlStatsController } from '../controllers/GetBatchUrlStatsController';

export function registerCardsModuleRoutes(
  app: IRouter,
  authMiddleware: AuthMiddleware,
  // Card controllers
  addUrlToLibraryController: AddUrlToLibraryController,
  addAnnotationToLibraryController: AddAnnotationToLibraryController,
  addCardToLibraryController: AddCardToLibraryController,
  addCardToCollectionController: AddCardToCollectionController,
  updateNoteCardController: UpdateNoteCardController,
  updateUrlCardAssociationsController: UpdateUrlCardAssociationsController,
  updateAnnotationAssociationsController: UpdateAnnotationAssociationsController,
  removeCardFromLibraryController: RemoveCardFromLibraryController,
  removeCardFromCollectionController: RemoveCardFromCollectionController,
  getUrlMetadataController: GetUrlMetadataController,
  getUrlCardViewController: GetUrlCardViewController,
  getLibrariesForCardController: GetLibrariesForCardController,
  getMyUrlCardsController: GetMyUrlCardsController,
  getUserUrlCardsController: GetUserUrlCardsController,
  getUrlStatusForMyLibraryController: GetUrlStatusForMyLibraryController,
  getAnnotationStatusForMyLibraryController: GetAnnotationStatusForMyLibraryController,
  getLibrariesForUrlController: GetLibrariesForUrlController,
  getNoteCardsForUrlController: GetNoteCardsForUrlController,
  getAnnotationsForUrlController: GetAnnotationsForUrlController,
  getAnnotationController: GetAnnotationController,
  getNotesForAnnotationController: GetNotesForAnnotationController,
  getLibrariesForAnnotationController: GetLibrariesForAnnotationController,
  searchUrlsController: SearchUrlsController,
  getBatchUrlStatsController: GetBatchUrlStatsController,
  // Collection controllers
  createCollectionController: CreateCollectionController,
  updateCollectionController: UpdateCollectionController,
  deleteCollectionController: DeleteCollectionController,
  getCollectionPageController: GetCollectionPageController,
  getCollectionPageByAtUriController: GetCollectionPageByAtUriController,
  getMyCollectionsController: GetMyCollectionsController,
  getCollectionsController: GetUserCollectionsController,
  getCollectionsForUrlController: GetCollectionsForUrlController,
  getCollectionsForAnnotationController: GetCollectionsForAnnotationController,
  getRecommendedCollectionsForUrlController: GetRecommendedCollectionsForUrlController,
  searchCollectionsController: SearchCollectionsController,
  getOpenCollectionsWithContributorController: GetOpenCollectionsWithContributorController,
  getCollectionFollowersController: GetCollectionFollowersController,
  getCollectionFollowersCountController: GetCollectionFollowersCountController,
  getCollectionContributorsController: GetCollectionContributorsController,
): void {
  registerCardRoutes(
    app,
    authMiddleware,
    addUrlToLibraryController,
    addAnnotationToLibraryController,
    addCardToLibraryController,
    addCardToCollectionController,
    updateNoteCardController,
    updateUrlCardAssociationsController,
    updateAnnotationAssociationsController,
    removeCardFromLibraryController,
    removeCardFromCollectionController,
    getUrlMetadataController,
    getUrlCardViewController,
    getLibrariesForCardController,
    getMyUrlCardsController,
    getUserUrlCardsController,
    getUrlStatusForMyLibraryController,
    getAnnotationStatusForMyLibraryController,
    getLibrariesForUrlController,
    getNoteCardsForUrlController,
    getAnnotationsForUrlController,
    getAnnotationController,
    getNotesForAnnotationController,
    getLibrariesForAnnotationController,
    searchUrlsController,
    getBatchUrlStatsController,
  );

  registerCollectionRoutes(
    app,
    authMiddleware,
    createCollectionController,
    updateCollectionController,
    deleteCollectionController,
    getCollectionPageController,
    getMyCollectionsController,
    getCollectionsController,
    getCollectionPageByAtUriController,
    getCollectionsForUrlController,
    getCollectionsForAnnotationController,
    getRecommendedCollectionsForUrlController,
    searchCollectionsController,
    getOpenCollectionsWithContributorController,
    getCollectionFollowersController,
    getCollectionFollowersCountController,
    getCollectionContributorsController,
  );
}
