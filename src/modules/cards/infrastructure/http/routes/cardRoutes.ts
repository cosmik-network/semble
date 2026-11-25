import { IRouter } from 'express';
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
import { GetBatchUrlStatsController } from '../controllers/GetBatchUrlStatsController';
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
import { SearchUrlsController } from '../controllers/SearchUrlsController';
import { AuthMiddleware } from 'src/shared/infrastructure/http/middleware';
import { routes } from '@semble/types';
import { cardsContract } from '@semble/contract';
import {
  validateBody,
  validateQuery,
} from 'src/shared/infrastructure/http/middleware/validateContract';

export function registerCardRoutes(
  app: IRouter,
  authMiddleware: AuthMiddleware,
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
): void {
  app.get(
    routes.cards.searchCards.path,
    authMiddleware.optionalAuth(),
    validateQuery(cardsContract.searchCards.query),
    (req, res) => searchUrlsController.execute(req, res),
  );

  app.get(
    routes.cards.urlMetadata.path,
    authMiddleware.optionalAuth(),
    validateQuery(cardsContract.urlMetadata.query),
    (req, res) => getUrlMetadataController.execute(req, res),
  );

  app.post(
    routes.cards.batchUrlStats.path,
    authMiddleware.optionalAuth(),
    validateBody(cardsContract.batchUrlStats.body),
    (req, res) => getBatchUrlStatsController.execute(req, res),
  );

  app.get(
    routes.cards.myUrlCards.path,
    authMiddleware.ensureAuthenticated(),
    validateQuery(cardsContract.myUrlCards.query),
    (req, res) => getMyUrlCardsController.execute(req, res),
  );

  app.get(
    routes.cards.urlLibraryStatus.path,
    authMiddleware.ensureAuthenticated(),
    validateQuery(cardsContract.urlLibraryStatus.query),
    (req, res) => getUrlStatusForMyLibraryController.execute(req, res),
  );

  app.get(
    routes.cards.annotationLibraryStatus.path,
    authMiddleware.ensureAuthenticated(),
    validateQuery(cardsContract.annotationLibraryStatus.query),
    (req, res) => getAnnotationStatusForMyLibraryController.execute(req, res),
  );

  app.get(
    routes.cards.librariesForUrl.path,
    authMiddleware.optionalAuth(),
    validateQuery(cardsContract.librariesForUrl.query),
    (req, res) => getLibrariesForUrlController.execute(req, res),
  );

  app.get(
    routes.cards.noteCardsForUrl.path,
    authMiddleware.optionalAuth(),
    validateQuery(cardsContract.noteCardsForUrl.query),
    (req, res) => getNoteCardsForUrlController.execute(req, res),
  );

  app.get(
    routes.cards.annotationsForUrl.path,
    authMiddleware.optionalAuth(),
    validateQuery(cardsContract.annotationsForUrl.query),
    (req, res) => getAnnotationsForUrlController.execute(req, res),
  );

  app.get(
    routes.cards.getAnnotation.path,
    authMiddleware.optionalAuth(),
    validateQuery(cardsContract.getAnnotation.query),
    (req, res) => getAnnotationController.execute(req, res),
  );

  app.get(
    routes.cards.notesForAnnotation.path,
    authMiddleware.optionalAuth(),
    validateQuery(cardsContract.notesForAnnotation.query),
    (req, res) => getNotesForAnnotationController.execute(req, res),
  );

  app.get(
    routes.cards.librariesForAnnotation.path,
    authMiddleware.optionalAuth(),
    validateQuery(cardsContract.librariesForAnnotation.query),
    (req, res) => getLibrariesForAnnotationController.execute(req, res),
  );

  app.get(
    routes.cards.cardsByUser.path,
    authMiddleware.optionalAuth(),
    validateQuery(cardsContract.cardsByUser.query),
    (req, res) => getUserUrlCardsController.execute(req, res),
  );

  app.get(
    routes.cards.cardLibraries.path,
    authMiddleware.optionalAuth(),
    validateQuery(cardsContract.cardLibraries.query),
    (req, res) => getLibrariesForCardController.execute(req, res),
  );

  app.get(
    routes.cards.cardById.path,
    authMiddleware.optionalAuth(),
    validateQuery(cardsContract.cardById.query),
    (req, res) => getUrlCardViewController.execute(req, res),
  );

  app.post(
    routes.cards.addUrlToLibrary.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(cardsContract.addUrlToLibrary.body),
    (req, res) => addUrlToLibraryController.execute(req, res),
  );

  app.post(
    routes.cards.addAnnotationToLibrary.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(cardsContract.addAnnotationToLibrary.body),
    (req, res) => addAnnotationToLibraryController.execute(req, res),
  );

  app.post(
    routes.cards.addCardToLibrary.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(cardsContract.addCardToLibrary.body),
    (req, res) => addCardToLibraryController.execute(req, res),
  );

  app.post(
    routes.cards.addCardToCollection.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(cardsContract.addCardToCollection.body),
    (req, res) => addCardToCollectionController.execute(req, res),
  );

  app.post(
    routes.cards.cardNote.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(cardsContract.cardNote.body),
    (req, res) => updateNoteCardController.execute(req, res),
  );

  app.post(
    routes.cards.urlCardAssociations.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(cardsContract.urlCardAssociations.body),
    (req, res) => updateUrlCardAssociationsController.execute(req, res),
  );

  app.post(
    routes.cards.annotationCardAssociations.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(cardsContract.annotationCardAssociations.body),
    (req, res) => updateAnnotationAssociationsController.execute(req, res),
  );

  app.post(
    routes.cards.removeFromLibrary.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(cardsContract.removeFromLibrary.body),
    (req, res) => removeCardFromLibraryController.execute(req, res),
  );

  app.post(
    routes.cards.removeFromCollections.path,
    authMiddleware.ensureAuthenticated(),
    validateBody(cardsContract.removeFromCollections.body),
    (req, res) => removeCardFromCollectionController.execute(req, res),
  );
}
