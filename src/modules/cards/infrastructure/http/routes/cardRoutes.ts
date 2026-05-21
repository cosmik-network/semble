import { Express } from 'express';
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
import { SearchUrlsController } from '../controllers/SearchUrlsController';
import { AuthMiddleware } from 'src/shared/infrastructure/http/middleware';
import { routes } from '@semble/types';

export function registerCardRoutes(
  app: Express,
  authMiddleware: AuthMiddleware,
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
  searchUrlsController: SearchUrlsController,
): void {
  app.get(
    routes.cards.searchCards.path,
    authMiddleware.optionalAuth(),
    (req, res) => searchUrlsController.execute(req, res),
  );

  app.get(
    routes.cards.urlMetadata.path,
    authMiddleware.optionalAuth(),
    (req, res) => getUrlMetadataController.execute(req, res),
  );

  app.get(
    routes.cards.myUrlCards.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => getMyUrlCardsController.execute(req, res),
  );

  app.get(
    routes.cards.urlLibraryStatus.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => getUrlStatusForMyLibraryController.execute(req, res),
  );

  app.get(
    routes.cards.librariesForUrl.path,
    authMiddleware.optionalAuth(),
    (req, res) => getLibrariesForUrlController.execute(req, res),
  );

  app.get(
    routes.cards.noteCardsForUrl.path,
    authMiddleware.optionalAuth(),
    (req, res) => getNoteCardsForUrlController.execute(req, res),
  );

  app.get(
    routes.cards.cardsByUser.path,
    authMiddleware.optionalAuth(),
    (req, res) => getUserUrlCardsController.execute(req, res),
  );

  app.get(
    routes.cards.cardLibraries.path,
    authMiddleware.optionalAuth(),
    (req, res) => getLibrariesForCardController.execute(req, res),
  );

  app.get(
    routes.cards.cardById.path,
    authMiddleware.optionalAuth(),
    (req, res) => getUrlCardViewController.execute(req, res),
  );

  app.post(
    routes.cards.addUrlToLibrary.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => addUrlToLibraryController.execute(req, res),
  );

  app.post(
    routes.cards.addCardToLibrary.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => addCardToLibraryController.execute(req, res),
  );

  app.post(
    routes.cards.addCardToCollection.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => addCardToCollectionController.execute(req, res),
  );

  app.put(
    routes.cards.cardNote.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => updateNoteCardController.execute(req, res),
  );

  app.put(
    routes.cards.urlCardAssociations.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => updateUrlCardAssociationsController.execute(req, res),
  );

  app.delete(
    routes.cards.removeFromLibrary.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => removeCardFromLibraryController.execute(req, res),
  );

  app.delete(
    routes.cards.removeFromCollections.path,
    authMiddleware.ensureAuthenticated(),
    (req, res) => removeCardFromCollectionController.execute(req, res),
  );
}
