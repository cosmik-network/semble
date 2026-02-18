import { InitiateOAuthSignInController } from '../../../../modules/user/infrastructure/http/controllers/InitiateOAuthSignInController';
import { CompleteOAuthSignInController } from '../../../../modules/user/infrastructure/http/controllers/CompleteOAuthSignInController';
import { RefreshAccessTokenController } from '../../../../modules/user/infrastructure/http/controllers/RefreshAccessTokenController';
import { AddUrlToLibraryController } from '../../../../modules/cards/infrastructure/http/controllers/AddUrlToLibraryController';
import { AddCardToLibraryController } from '../../../../modules/cards/infrastructure/http/controllers/AddCardToLibraryController';
import { AddCardToCollectionController } from '../../../../modules/cards/infrastructure/http/controllers/AddCardToCollectionController';
import { UpdateNoteCardController } from '../../../../modules/cards/infrastructure/http/controllers/UpdateNoteCardController';
import { UpdateUrlCardAssociationsController } from '../../../../modules/cards/infrastructure/http/controllers/UpdateUrlCardAssociationsController';
import { RemoveCardFromLibraryController } from '../../../../modules/cards/infrastructure/http/controllers/RemoveCardFromLibraryController';
import { RemoveCardFromCollectionController } from '../../../../modules/cards/infrastructure/http/controllers/RemoveCardFromCollectionController';
import { GetUrlMetadataController } from '../../../../modules/cards/infrastructure/http/controllers/GetUrlMetadataController';
import { GetUrlCardViewController } from '../../../../modules/cards/infrastructure/http/controllers/GetUrlCardViewController';
import { GetLibrariesForCardController } from '../../../../modules/cards/infrastructure/http/controllers/GetLibrariesForCardController';
import { GetMyUrlCardsController } from '../../../../modules/cards/infrastructure/http/controllers/GetMyUrlCardsController';
import { GetUserUrlCardsController } from '../../../../modules/cards/infrastructure/http/controllers/GetUserUrlCardsController';
import { CreateCollectionController } from '../../../../modules/cards/infrastructure/http/controllers/CreateCollectionController';
import { UpdateCollectionController } from '../../../../modules/cards/infrastructure/http/controllers/UpdateCollectionController';
import { DeleteCollectionController } from '../../../../modules/cards/infrastructure/http/controllers/DeleteCollectionController';
import { GetCollectionPageController } from '../../../../modules/cards/infrastructure/http/controllers/GetCollectionPageController';
import { GetMyCollectionsController } from '../../../../modules/cards/infrastructure/http/controllers/GetMyCollectionsController';
import { GetGlobalFeedController } from '../../../../modules/feeds/infrastructure/http/controllers/GetGlobalFeedController';
import { GetGemActivityFeedController } from '../../../../modules/feeds/infrastructure/http/controllers/GetGemActivityFeedController';
import { GetFollowingFeedController } from '../../../../modules/feeds/infrastructure/http/controllers/GetFollowingFeedController';
import { GetSimilarUrlsForUrlController } from '../../../../modules/search/infrastructure/http/controllers/GetSimilarUrlsForUrlController';
import { SemanticSearchUrlsController } from '../../../../modules/search/infrastructure/http/controllers/SemanticSearchUrlsController';
import { SearchBskyPostsForUrlController } from '../../../../modules/search/infrastructure/http/controllers/SearchBskyPostsForUrlController';
import { SearchAtProtoAccountsController } from '../../../../modules/search/infrastructure/http/controllers/SearchAtProtoAccountsController';
import { SearchLeafletDocsForUrlController } from '../../../../modules/search/infrastructure/http/controllers/SearchLeafletDocsForUrlController';
import { UseCases } from './UseCaseFactory';
import { GetMyProfileController } from 'src/modules/cards/infrastructure/http/controllers/GetMyProfileController';
import { GetUserProfileController } from 'src/modules/cards/infrastructure/http/controllers/GetUserProfileController';
import { LoginWithAppPasswordController } from 'src/modules/user/infrastructure/http/controllers/LoginWithAppPasswordController';
import { LogoutController } from 'src/modules/user/infrastructure/http/controllers/LogoutController';
import { GenerateExtensionTokensController } from 'src/modules/user/infrastructure/http/controllers/GenerateExtensionTokensController';
import { GetUserCollectionsController } from 'src/modules/cards/infrastructure/http/controllers/GetUserCollectionsController';
import { SearchCollectionsController } from 'src/modules/cards/infrastructure/http/controllers/SearchCollectionsController';
import { GetOpenCollectionsWithContributorController } from 'src/modules/cards/infrastructure/http/controllers/GetOpenCollectionsWithContributorController';
import { GetCollectionPageByAtUriController } from 'src/modules/cards/infrastructure/http/controllers/GetCollectionPageByAtUriController';
import { GetUrlStatusForMyLibraryController } from '../../../../modules/cards/infrastructure/http/controllers/GetUrlStatusForMyLibraryController';
import { GetLibrariesForUrlController } from '../../../../modules/cards/infrastructure/http/controllers/GetLibrariesForUrlController';
import { GetCollectionsForUrlController } from '../../../../modules/cards/infrastructure/http/controllers/GetCollectionsForUrlController';
import { GetNoteCardsForUrlController } from '../../../../modules/cards/infrastructure/http/controllers/GetNoteCardsForUrlController';
import { GetMyNotificationsController } from '../../../../modules/notifications/infrastructure/http/controllers/GetMyNotificationsController';
import { GetUnreadNotificationCountController } from '../../../../modules/notifications/infrastructure/http/controllers/GetUnreadNotificationCountController';
import { MarkNotificationsAsReadController } from '../../../../modules/notifications/infrastructure/http/controllers/MarkNotificationsAsReadController';
import { MarkAllNotificationsAsReadController } from '../../../../modules/notifications/infrastructure/http/controllers/MarkAllNotificationsAsReadController';
import { FollowTargetController } from '../../../../modules/user/infrastructure/http/controllers/FollowTargetController';
import { UnfollowTargetController } from '../../../../modules/user/infrastructure/http/controllers/UnfollowTargetController';
import { GetFollowingUsersController } from '../../../../modules/user/infrastructure/http/controllers/GetFollowingUsersController';
import { GetFollowersController } from '../../../../modules/user/infrastructure/http/controllers/GetFollowersController';
import { GetFollowingCollectionsController } from '../../../../modules/user/infrastructure/http/controllers/GetFollowingCollectionsController';
import { GetFollowingCountController } from '../../../../modules/user/infrastructure/http/controllers/GetFollowingCountController';
import { GetFollowersCountController } from '../../../../modules/user/infrastructure/http/controllers/GetFollowersCountController';
import { GetFollowingCollectionsCountController } from '../../../../modules/user/infrastructure/http/controllers/GetFollowingCollectionsCountController';
import { GetCollectionFollowersController } from '../../../../modules/cards/infrastructure/http/controllers/GetCollectionFollowersController';
import { GetCollectionFollowersCountController } from '../../../../modules/cards/infrastructure/http/controllers/GetCollectionFollowersCountController';
import { CookieService } from '../services/CookieService';

export interface Controllers {
  // User controllers
  loginWithAppPasswordController: LoginWithAppPasswordController;
  logoutController: LogoutController;
  initiateOAuthSignInController: InitiateOAuthSignInController;
  completeOAuthSignInController: CompleteOAuthSignInController;
  getMyProfileController: GetMyProfileController;
  getUserProfileController: GetUserProfileController;
  refreshAccessTokenController: RefreshAccessTokenController;
  generateExtensionTokensController: GenerateExtensionTokensController;
  followTargetController: FollowTargetController;
  unfollowTargetController: UnfollowTargetController;
  getFollowingUsersController: GetFollowingUsersController;
  getFollowersController: GetFollowersController;
  getFollowingCollectionsController: GetFollowingCollectionsController;
  getFollowingCountController: GetFollowingCountController;
  getFollowersCountController: GetFollowersCountController;
  getFollowingCollectionsCountController: GetFollowingCollectionsCountController;
  // Card controllers
  addUrlToLibraryController: AddUrlToLibraryController;
  addCardToLibraryController: AddCardToLibraryController;
  addCardToCollectionController: AddCardToCollectionController;
  updateNoteCardController: UpdateNoteCardController;
  updateUrlCardAssociationsController: UpdateUrlCardAssociationsController;
  removeCardFromLibraryController: RemoveCardFromLibraryController;
  removeCardFromCollectionController: RemoveCardFromCollectionController;
  getUrlMetadataController: GetUrlMetadataController;
  getUrlCardViewController: GetUrlCardViewController;
  getLibrariesForCardController: GetLibrariesForCardController;
  getMyUrlCardsController: GetMyUrlCardsController;
  getUserUrlCardsController: GetUserUrlCardsController;
  createCollectionController: CreateCollectionController;
  updateCollectionController: UpdateCollectionController;
  deleteCollectionController: DeleteCollectionController;
  getCollectionPageController: GetCollectionPageController;
  getCollectionPageByAtUriController: GetCollectionPageByAtUriController;
  getMyCollectionsController: GetMyCollectionsController;
  getCollectionsController: GetUserCollectionsController;
  searchCollectionsController: SearchCollectionsController;
  getOpenCollectionsWithContributorController: GetOpenCollectionsWithContributorController;
  getUrlStatusForMyLibraryController: GetUrlStatusForMyLibraryController;
  getLibrariesForUrlController: GetLibrariesForUrlController;
  getCollectionsForUrlController: GetCollectionsForUrlController;
  getNoteCardsForUrlController: GetNoteCardsForUrlController;
  getCollectionFollowersController: GetCollectionFollowersController;
  getCollectionFollowersCountController: GetCollectionFollowersCountController;
  // Feed controllers
  getGlobalFeedController: GetGlobalFeedController;
  getGemActivityFeedController: GetGemActivityFeedController;
  getFollowingFeedController: GetFollowingFeedController;
  // Search controllers
  getSimilarUrlsForUrlController: GetSimilarUrlsForUrlController;
  semanticSearchUrlsController: SemanticSearchUrlsController;
  searchBskyPostsForUrlController: SearchBskyPostsForUrlController;
  searchAtProtoAccountsController: SearchAtProtoAccountsController;
  searchLeafletDocsForUrlController: SearchLeafletDocsForUrlController;
  // Notification controllers
  getMyNotificationsController: GetMyNotificationsController;
  getUnreadNotificationCountController: GetUnreadNotificationCountController;
  markNotificationsAsReadController: MarkNotificationsAsReadController;
  markAllNotificationsAsReadController: MarkAllNotificationsAsReadController;
}

export class ControllerFactory {
  static create(useCases: UseCases, cookieService: CookieService): Controllers {
    return {
      // User controllers
      loginWithAppPasswordController: new LoginWithAppPasswordController(
        useCases.loginWithAppPasswordUseCase,
        cookieService,
      ),
      logoutController: new LogoutController(
        useCases.logoutUseCase,
        cookieService,
      ),
      initiateOAuthSignInController: new InitiateOAuthSignInController(
        useCases.initiateOAuthSignInUseCase,
      ),
      completeOAuthSignInController: new CompleteOAuthSignInController(
        useCases.completeOAuthSignInUseCase,
        cookieService,
      ),
      getMyProfileController: new GetMyProfileController(
        useCases.getProfileUseCase,
      ),
      getUserProfileController: new GetUserProfileController(
        useCases.getProfileUseCase,
      ),
      refreshAccessTokenController: new RefreshAccessTokenController(
        useCases.refreshAccessTokenUseCase,
        cookieService,
      ),
      generateExtensionTokensController: new GenerateExtensionTokensController(
        useCases.generateExtensionTokensUseCase,
      ),
      followTargetController: new FollowTargetController(
        useCases.followTargetUseCase,
      ),
      unfollowTargetController: new UnfollowTargetController(
        useCases.unfollowTargetUseCase,
      ),
      getFollowingUsersController: new GetFollowingUsersController(
        useCases.getFollowingUsersUseCase,
      ),
      getFollowersController: new GetFollowersController(
        useCases.getFollowersUseCase,
      ),
      getFollowingCollectionsController: new GetFollowingCollectionsController(
        useCases.getFollowingCollectionsUseCase,
      ),
      getFollowingCountController: new GetFollowingCountController(
        useCases.getFollowingCountUseCase,
      ),
      getFollowersCountController: new GetFollowersCountController(
        useCases.getFollowersCountUseCase,
      ),
      getFollowingCollectionsCountController:
        new GetFollowingCollectionsCountController(
          useCases.getFollowingCollectionsCountUseCase,
        ),

      // Card controllers
      addUrlToLibraryController: new AddUrlToLibraryController(
        useCases.addUrlToLibraryUseCase,
      ),
      addCardToLibraryController: new AddCardToLibraryController(
        useCases.addCardToLibraryUseCase,
      ),
      addCardToCollectionController: new AddCardToCollectionController(
        useCases.addCardToCollectionUseCase,
      ),
      updateNoteCardController: new UpdateNoteCardController(
        useCases.updateNoteCardUseCase,
      ),
      updateUrlCardAssociationsController:
        new UpdateUrlCardAssociationsController(
          useCases.updateUrlCardAssociationsUseCase,
        ),
      removeCardFromLibraryController: new RemoveCardFromLibraryController(
        useCases.removeCardFromLibraryUseCase,
      ),
      removeCardFromCollectionController:
        new RemoveCardFromCollectionController(
          useCases.removeCardFromCollectionUseCase,
        ),
      getUrlMetadataController: new GetUrlMetadataController(
        useCases.getUrlMetadataUseCase,
      ),
      getUrlCardViewController: new GetUrlCardViewController(
        useCases.getUrlCardViewUseCase,
      ),
      getLibrariesForCardController: new GetLibrariesForCardController(
        useCases.getLibrariesForCardUseCase,
      ),
      getMyUrlCardsController: new GetMyUrlCardsController(
        useCases.getMyUrlCardsUseCase,
      ),
      getUserUrlCardsController: new GetUserUrlCardsController(
        useCases.getMyUrlCardsUseCase,
      ),
      createCollectionController: new CreateCollectionController(
        useCases.createCollectionUseCase,
      ),
      updateCollectionController: new UpdateCollectionController(
        useCases.updateCollectionUseCase,
      ),
      deleteCollectionController: new DeleteCollectionController(
        useCases.deleteCollectionUseCase,
      ),
      getCollectionPageController: new GetCollectionPageController(
        useCases.getCollectionPageUseCase,
      ),
      getCollectionPageByAtUriController:
        new GetCollectionPageByAtUriController(
          useCases.getCollectionPageByAtUriUseCase,
        ),
      getMyCollectionsController: new GetMyCollectionsController(
        useCases.getCollectionsUseCase,
      ),
      getCollectionsController: new GetUserCollectionsController(
        useCases.getCollectionsUseCase,
      ),
      searchCollectionsController: new SearchCollectionsController(
        useCases.searchCollectionsUseCase,
      ),
      getOpenCollectionsWithContributorController:
        new GetOpenCollectionsWithContributorController(
          useCases.getOpenCollectionsWithContributorUseCase,
        ),
      getUrlStatusForMyLibraryController:
        new GetUrlStatusForMyLibraryController(
          useCases.getUrlStatusForMyLibraryUseCase,
        ),
      getLibrariesForUrlController: new GetLibrariesForUrlController(
        useCases.getLibrariesForUrlUseCase,
      ),
      getCollectionsForUrlController: new GetCollectionsForUrlController(
        useCases.getCollectionsForUrlUseCase,
      ),
      getNoteCardsForUrlController: new GetNoteCardsForUrlController(
        useCases.getNoteCardsForUrlUseCase,
      ),
      getCollectionFollowersController: new GetCollectionFollowersController(
        useCases.getCollectionFollowersUseCase,
      ),
      getCollectionFollowersCountController:
        new GetCollectionFollowersCountController(
          useCases.getCollectionFollowersCountUseCase,
        ),

      // Feed controllers
      getGlobalFeedController: new GetGlobalFeedController(
        useCases.getGlobalFeedUseCase,
      ),
      getGemActivityFeedController: new GetGemActivityFeedController(
        useCases.getGemActivityFeedUseCase,
      ),
      getFollowingFeedController: new GetFollowingFeedController(
        useCases.getFollowingFeedUseCase,
      ),
      // Search controllers
      getSimilarUrlsForUrlController: new GetSimilarUrlsForUrlController(
        useCases.getSimilarUrlsForUrlUseCase,
      ),
      semanticSearchUrlsController: new SemanticSearchUrlsController(
        useCases.semanticSearchUrlsUseCase,
      ),
      searchBskyPostsForUrlController: new SearchBskyPostsForUrlController(
        useCases.searchBskyPostsForUrlUseCase,
      ),
      searchAtProtoAccountsController: new SearchAtProtoAccountsController(
        useCases.searchAtProtoAccountsUseCase,
      ),
      searchLeafletDocsForUrlController: new SearchLeafletDocsForUrlController(
        useCases.searchLeafletDocsForUrlUseCase,
      ),
      // Notification controllers
      getMyNotificationsController: new GetMyNotificationsController(
        useCases.getMyNotificationsUseCase,
      ),
      getUnreadNotificationCountController:
        new GetUnreadNotificationCountController(
          useCases.getUnreadNotificationCountUseCase,
        ),
      markNotificationsAsReadController: new MarkNotificationsAsReadController(
        useCases.markNotificationsAsReadUseCase,
      ),
      markAllNotificationsAsReadController:
        new MarkAllNotificationsAsReadController(
          useCases.markAllNotificationsAsReadUseCase,
        ),
    };
  }
}
