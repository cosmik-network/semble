import { InitiateOAuthSignInUseCase } from '../../../../modules/user/application/use-cases/InitiateOAuthSignInUseCase';
import { CompleteOAuthSignInUseCase } from '../../../../modules/user/application/use-cases/CompleteOAuthSignInUseCase';
import { RefreshAccessTokenUseCase } from '../../../../modules/user/application/use-cases/RefreshAccessTokenUseCase';
import { AddUrlToLibraryUseCase } from '../../../../modules/cards/application/useCases/commands/AddUrlToLibraryUseCase';
import { AddCardToLibraryUseCase } from '../../../../modules/cards/application/useCases/commands/AddCardToLibraryUseCase';
import { AddCardToCollectionUseCase } from '../../../../modules/cards/application/useCases/commands/AddCardToCollectionUseCase';
import { UpdateNoteCardUseCase } from '../../../../modules/cards/application/useCases/commands/UpdateNoteCardUseCase';
import { UpdateUrlCardAssociationsUseCase } from '../../../../modules/cards/application/useCases/commands/UpdateUrlCardAssociationsUseCase';
import { RemoveCardFromLibraryUseCase } from '../../../../modules/cards/application/useCases/commands/RemoveCardFromLibraryUseCase';
import { RemoveCardFromCollectionUseCase } from '../../../../modules/cards/application/useCases/commands/RemoveCardFromCollectionUseCase';
import { GetUrlMetadataUseCase } from '../../../../modules/cards/application/useCases/queries/GetUrlMetadataUseCase';
import { GetUrlCardViewUseCase } from '../../../../modules/cards/application/useCases/queries/GetUrlCardViewUseCase';
import { GetLibrariesForCardUseCase } from '../../../../modules/cards/application/useCases/queries/GetLibrariesForCardUseCase';
import { GetUrlCardsUseCase } from '../../../../modules/cards/application/useCases/queries/GetUrlCardsUseCase';
import { CreateCollectionUseCase } from '../../../../modules/cards/application/useCases/commands/CreateCollectionUseCase';
import { UpdateCollectionUseCase } from '../../../../modules/cards/application/useCases/commands/UpdateCollectionUseCase';
import { DeleteCollectionUseCase } from '../../../../modules/cards/application/useCases/commands/DeleteCollectionUseCase';
import { GetCollectionPageUseCase } from '../../../../modules/cards/application/useCases/queries/GetCollectionPageUseCase';
import { Repositories } from './RepositoryFactory';
import { Services, SharedServices } from './ServiceFactory';
import { GetProfileUseCase } from 'src/modules/cards/application/useCases/queries/GetProfileUseCase';
import { LoginWithAppPasswordUseCase } from 'src/modules/user/application/use-cases/LoginWithAppPasswordUseCase';
import { LogoutUseCase } from 'src/modules/user/application/use-cases/LogoutUseCase';
import { GenerateExtensionTokensUseCase } from 'src/modules/user/application/use-cases/GenerateExtensionTokensUseCase';
import { GetGlobalFeedUseCase } from '../../../../modules/feeds/application/useCases/queries/GetGlobalFeedUseCase';
import { GetGemActivityFeedUseCase } from '../../../../modules/feeds/application/useCases/queries/GetGemActivityFeedUseCase';
import { GetFollowingFeedUseCase } from '../../../../modules/feeds/application/useCases/queries/GetFollowingFeedUseCase';
import { AddActivityToFeedUseCase } from '../../../../modules/feeds/application/useCases/commands/AddActivityToFeedUseCase';
import { GetCollectionsUseCase } from 'src/modules/cards/application/useCases/queries/GetCollectionsUseCase';
import { SearchCollectionsUseCase } from 'src/modules/cards/application/useCases/queries/SearchCollectionsUseCase';
import { GetOpenCollectionsWithContributorUseCase } from 'src/modules/cards/application/useCases/queries/GetOpenCollectionsWithContributorUseCase';
import { GetCollectionPageByAtUriUseCase } from 'src/modules/cards/application/useCases/queries/GetCollectionPageByAtUriUseCase';
import { GetUrlStatusForMyLibraryUseCase } from '../../../../modules/cards/application/useCases/queries/GetUrlStatusForMyLibraryUseCase';
import { GetLibrariesForUrlUseCase } from '../../../../modules/cards/application/useCases/queries/GetLibrariesForUrlUseCase';
import { GetCollectionsForUrlUseCase } from '../../../../modules/cards/application/useCases/queries/GetCollectionsForUrlUseCase';
import { GetNoteCardsForUrlUseCase } from '../../../../modules/cards/application/useCases/queries/GetNoteCardsForUrlUseCase';
import { IndexUrlForSearchUseCase } from '../../../../modules/search/application/useCases/commands/IndexUrlForSearchUseCase';
import { GetSimilarUrlsForUrlUseCase } from '../../../../modules/search/application/useCases/queries/GetSimilarUrlsForUrlUseCase';
import { SemanticSearchUrlsUseCase } from '../../../../modules/search/application/useCases/queries/SemanticSearchUrlsUseCase';
import { SearchBskyPostsForUrlUseCase } from '../../../../modules/search/application/use-cases/SearchBskyPostsForUrlUseCase';
import { SearchAtProtoAccountsUseCase } from '../../../../modules/search/application/use-cases/SearchAtProtoAccountsUseCase';
import { SearchLeafletDocsForUrlUseCase } from '../../../../modules/search/application/use-cases/SearchLeafletDocsForUrlUseCase';
import { ProcessCardFirehoseEventUseCase } from '../../../../modules/atproto/application/useCases/ProcessCardFirehoseEventUseCase';
import { ProcessCollectionFirehoseEventUseCase } from '../../../../modules/atproto/application/useCases/ProcessCollectionFirehoseEventUseCase';
import { ProcessCollectionLinkFirehoseEventUseCase } from '../../../../modules/atproto/application/useCases/ProcessCollectionLinkFirehoseEventUseCase';
import { ProcessMarginBookmarkFirehoseEventUseCase } from '../../../../modules/atproto/application/useCases/ProcessMarginBookmarkFirehoseEventUseCase';
import { ProcessMarginCollectionFirehoseEventUseCase } from '../../../../modules/atproto/application/useCases/ProcessMarginCollectionFirehoseEventUseCase';
import { ProcessMarginCollectionItemFirehoseEventUseCase } from '../../../../modules/atproto/application/useCases/ProcessMarginCollectionItemFirehoseEventUseCase';
import { ProcessCollectionLinkRemovalFirehoseEventUseCase } from '../../../../modules/atproto/application/useCases/ProcessCollectionLinkRemovalFirehoseEventUseCase';
import { GetMyNotificationsUseCase } from '../../../../modules/notifications/application/useCases/queries/GetMyNotificationsUseCase';
import { GetUnreadNotificationCountUseCase } from '../../../../modules/notifications/application/useCases/queries/GetUnreadNotificationCountUseCase';
import { MarkNotificationsAsReadUseCase } from '../../../../modules/notifications/application/useCases/commands/MarkNotificationsAsReadUseCase';
import { MarkAllNotificationsAsReadUseCase } from '../../../../modules/notifications/application/useCases/commands/MarkAllNotificationsAsReadUseCase';
import { CreateNotificationUseCase } from '../../../../modules/notifications/application/useCases/commands/CreateNotificationUseCase';
import { SyncAccountDataUseCase } from '../../../../modules/sync/application/useCases/SyncAccountDataUseCase';
import { FollowTargetUseCase } from '../../../../modules/user/application/useCases/commands/FollowTargetUseCase';
import { UnfollowTargetUseCase } from '../../../../modules/user/application/useCases/commands/UnfollowTargetUseCase';
import { GetFollowingUsersUseCase } from '../../../../modules/user/application/useCases/queries/GetFollowingUsersUseCase';
import { GetFollowersUseCase } from '../../../../modules/user/application/useCases/queries/GetFollowersUseCase';
import { GetFollowingCollectionsUseCase } from '../../../../modules/user/application/useCases/queries/GetFollowingCollectionsUseCase';
import { GetCollectionFollowersUseCase } from '../../../../modules/user/application/useCases/queries/GetCollectionFollowersUseCase';
import { GetFollowingCountUseCase } from '../../../../modules/user/application/useCases/queries/GetFollowingCountUseCase';
import { GetFollowersCountUseCase } from '../../../../modules/user/application/useCases/queries/GetFollowersCountUseCase';
import { GetFollowingCollectionsCountUseCase } from '../../../../modules/user/application/useCases/queries/GetFollowingCollectionsCountUseCase';
import { GetCollectionFollowersCountUseCase } from '../../../../modules/user/application/useCases/queries/GetCollectionFollowersCountUseCase';

export interface WorkerUseCases {
  addActivityToFeedUseCase: AddActivityToFeedUseCase;
  indexUrlForSearchUseCase: IndexUrlForSearchUseCase;
  createNotificationUseCase: CreateNotificationUseCase;
  syncAccountDataUseCase: SyncAccountDataUseCase;
  // Firehose-specific use cases
  addUrlToLibraryUseCase: AddUrlToLibraryUseCase;
  updateUrlCardAssociationsUseCase: UpdateUrlCardAssociationsUseCase;
  removeCardFromLibraryUseCase: RemoveCardFromLibraryUseCase;
  createCollectionUseCase: CreateCollectionUseCase;
  updateCollectionUseCase: UpdateCollectionUseCase;
  deleteCollectionUseCase: DeleteCollectionUseCase;
  processCardFirehoseEventUseCase: ProcessCardFirehoseEventUseCase;
  processCollectionFirehoseEventUseCase: ProcessCollectionFirehoseEventUseCase;
  processCollectionLinkFirehoseEventUseCase: ProcessCollectionLinkFirehoseEventUseCase;
  processMarginBookmarkFirehoseEventUseCase: ProcessMarginBookmarkFirehoseEventUseCase;
  processMarginCollectionFirehoseEventUseCase: ProcessMarginCollectionFirehoseEventUseCase;
  processMarginCollectionItemFirehoseEventUseCase: ProcessMarginCollectionItemFirehoseEventUseCase;
  processCollectionLinkRemovalFirehoseEventUseCase: ProcessCollectionLinkRemovalFirehoseEventUseCase;
}

export interface UseCases {
  // User use cases
  loginWithAppPasswordUseCase: LoginWithAppPasswordUseCase;
  logoutUseCase: LogoutUseCase;
  initiateOAuthSignInUseCase: InitiateOAuthSignInUseCase;
  completeOAuthSignInUseCase: CompleteOAuthSignInUseCase;
  getProfileUseCase: GetProfileUseCase;
  refreshAccessTokenUseCase: RefreshAccessTokenUseCase;
  generateExtensionTokensUseCase: GenerateExtensionTokensUseCase;
  followTargetUseCase: FollowTargetUseCase;
  unfollowTargetUseCase: UnfollowTargetUseCase;
  getFollowingUsersUseCase: GetFollowingUsersUseCase;
  getFollowersUseCase: GetFollowersUseCase;
  getFollowingCollectionsUseCase: GetFollowingCollectionsUseCase;
  getCollectionFollowersUseCase: GetCollectionFollowersUseCase;
  getFollowingCountUseCase: GetFollowingCountUseCase;
  getFollowersCountUseCase: GetFollowersCountUseCase;
  getFollowingCollectionsCountUseCase: GetFollowingCollectionsCountUseCase;
  getCollectionFollowersCountUseCase: GetCollectionFollowersCountUseCase;
  // Card use cases
  addUrlToLibraryUseCase: AddUrlToLibraryUseCase;
  addCardToLibraryUseCase: AddCardToLibraryUseCase;
  addCardToCollectionUseCase: AddCardToCollectionUseCase;
  updateNoteCardUseCase: UpdateNoteCardUseCase;
  updateUrlCardAssociationsUseCase: UpdateUrlCardAssociationsUseCase;
  removeCardFromLibraryUseCase: RemoveCardFromLibraryUseCase;
  removeCardFromCollectionUseCase: RemoveCardFromCollectionUseCase;
  getUrlMetadataUseCase: GetUrlMetadataUseCase;
  getUrlCardViewUseCase: GetUrlCardViewUseCase;
  getLibrariesForCardUseCase: GetLibrariesForCardUseCase;
  getMyUrlCardsUseCase: GetUrlCardsUseCase;
  createCollectionUseCase: CreateCollectionUseCase;
  updateCollectionUseCase: UpdateCollectionUseCase;
  deleteCollectionUseCase: DeleteCollectionUseCase;
  getCollectionPageUseCase: GetCollectionPageUseCase;
  getCollectionPageByAtUriUseCase: GetCollectionPageByAtUriUseCase;
  getCollectionsUseCase: GetCollectionsUseCase;
  searchCollectionsUseCase: SearchCollectionsUseCase;
  getOpenCollectionsWithContributorUseCase: GetOpenCollectionsWithContributorUseCase;
  getUrlStatusForMyLibraryUseCase: GetUrlStatusForMyLibraryUseCase;
  getLibrariesForUrlUseCase: GetLibrariesForUrlUseCase;
  getCollectionsForUrlUseCase: GetCollectionsForUrlUseCase;
  getNoteCardsForUrlUseCase: GetNoteCardsForUrlUseCase;
  // Feed use cases
  getGlobalFeedUseCase: GetGlobalFeedUseCase;
  getGemActivityFeedUseCase: GetGemActivityFeedUseCase;
  getFollowingFeedUseCase: GetFollowingFeedUseCase;
  addActivityToFeedUseCase: AddActivityToFeedUseCase;
  // Search use cases
  getSimilarUrlsForUrlUseCase: GetSimilarUrlsForUrlUseCase;
  semanticSearchUrlsUseCase: SemanticSearchUrlsUseCase;
  searchBskyPostsForUrlUseCase: SearchBskyPostsForUrlUseCase;
  searchAtProtoAccountsUseCase: SearchAtProtoAccountsUseCase;
  searchLeafletDocsForUrlUseCase: SearchLeafletDocsForUrlUseCase;
  // Notification use cases
  getMyNotificationsUseCase: GetMyNotificationsUseCase;
  getUnreadNotificationCountUseCase: GetUnreadNotificationCountUseCase;
  markNotificationsAsReadUseCase: MarkNotificationsAsReadUseCase;
  markAllNotificationsAsReadUseCase: MarkAllNotificationsAsReadUseCase;
}

export class UseCaseFactory {
  static create(repositories: Repositories, services: Services): UseCases {
    return this.createForWebApp(repositories, services);
  }

  static createForWebApp(
    repositories: Repositories,
    services: Services,
  ): UseCases {
    const getCollectionPageUseCase = new GetCollectionPageUseCase(
      repositories.collectionRepository,
      repositories.cardQueryRepository,
      services.profileService,
    );

    return {
      // User use cases
      loginWithAppPasswordUseCase: new LoginWithAppPasswordUseCase(
        services.appPasswordProcessor,
        services.tokenService,
        repositories.userRepository,
        services.userAuthService,
      ),
      logoutUseCase: new LogoutUseCase(services.tokenService),
      initiateOAuthSignInUseCase: new InitiateOAuthSignInUseCase(
        services.oauthProcessor,
      ),
      completeOAuthSignInUseCase: new CompleteOAuthSignInUseCase(
        services.oauthProcessor,
        services.tokenService,
        repositories.userRepository,
        services.userAuthService,
      ),
      getProfileUseCase: new GetProfileUseCase(
        services.profileService,
        services.identityResolutionService,
      ),
      refreshAccessTokenUseCase: new RefreshAccessTokenUseCase(
        services.tokenService,
      ),
      generateExtensionTokensUseCase: new GenerateExtensionTokensUseCase(
        services.tokenService,
      ),
      followTargetUseCase: new FollowTargetUseCase(
        repositories.followsRepository,
        repositories.userRepository,
        repositories.collectionRepository,
        services.followPublisher,
        services.eventPublisher,
      ),
      unfollowTargetUseCase: new UnfollowTargetUseCase(
        repositories.followsRepository,
        services.followPublisher,
        services.eventPublisher,
      ),
      getFollowingUsersUseCase: new GetFollowingUsersUseCase(
        repositories.followsRepository,
        services.identityResolutionService,
        services.profileService,
      ),
      getFollowersUseCase: new GetFollowersUseCase(
        repositories.followsRepository,
        services.identityResolutionService,
        services.profileService,
      ),
      getFollowingCollectionsUseCase: new GetFollowingCollectionsUseCase(
        repositories.followsRepository,
        services.identityResolutionService,
        services.profileService,
        repositories.collectionRepository,
      ),
      getCollectionFollowersUseCase: new GetCollectionFollowersUseCase(
        repositories.followsRepository,
        services.profileService,
        repositories.collectionRepository,
      ),
      getFollowingCountUseCase: new GetFollowingCountUseCase(
        repositories.followsRepository,
        services.identityResolutionService,
      ),
      getFollowersCountUseCase: new GetFollowersCountUseCase(
        repositories.followsRepository,
        services.identityResolutionService,
      ),
      getFollowingCollectionsCountUseCase:
        new GetFollowingCollectionsCountUseCase(
          repositories.followsRepository,
          services.identityResolutionService,
        ),
      getCollectionFollowersCountUseCase:
        new GetCollectionFollowersCountUseCase(
          repositories.followsRepository,
          repositories.collectionRepository,
        ),

      // Card use cases
      addUrlToLibraryUseCase: new AddUrlToLibraryUseCase(
        repositories.cardRepository,
        services.metadataService,
        services.cardLibraryService,
        services.cardCollectionService,
        services.eventPublisher,
      ),
      addCardToLibraryUseCase: new AddCardToLibraryUseCase(
        repositories.cardRepository,
        services.cardLibraryService,
        services.cardCollectionService,
      ),
      addCardToCollectionUseCase: new AddCardToCollectionUseCase(
        repositories.cardRepository,
        services.cardCollectionService,
        services.eventPublisher,
      ),
      updateNoteCardUseCase: new UpdateNoteCardUseCase(
        repositories.cardRepository,
        services.cardPublisher,
      ),
      updateUrlCardAssociationsUseCase: new UpdateUrlCardAssociationsUseCase(
        repositories.cardRepository,
        services.cardLibraryService,
        services.cardCollectionService,
        services.eventPublisher,
      ),
      removeCardFromLibraryUseCase: new RemoveCardFromLibraryUseCase(
        repositories.cardRepository,
        services.cardLibraryService,
        services.eventPublisher,
      ),
      removeCardFromCollectionUseCase: new RemoveCardFromCollectionUseCase(
        repositories.cardRepository,
        services.cardCollectionService,
        services.eventPublisher,
      ),
      getUrlMetadataUseCase: new GetUrlMetadataUseCase(
        services.metadataService,
        repositories.cardRepository,
      ),
      getUrlCardViewUseCase: new GetUrlCardViewUseCase(
        repositories.cardQueryRepository,
        services.profileService,
        repositories.collectionRepository,
      ),
      getLibrariesForCardUseCase: new GetLibrariesForCardUseCase(
        repositories.cardQueryRepository,
        services.profileService,
      ),
      getMyUrlCardsUseCase: new GetUrlCardsUseCase(
        repositories.cardQueryRepository,
        services.identityResolutionService,
        services.profileService,
      ),
      createCollectionUseCase: new CreateCollectionUseCase(
        repositories.collectionRepository,
        services.collectionPublisher,
      ),
      updateCollectionUseCase: new UpdateCollectionUseCase(
        repositories.collectionRepository,
        services.collectionPublisher,
      ),
      deleteCollectionUseCase: new DeleteCollectionUseCase(
        repositories.collectionRepository,
        services.collectionPublisher,
      ),
      getCollectionPageUseCase,
      getCollectionPageByAtUriUseCase: new GetCollectionPageByAtUriUseCase(
        services.identityResolutionService,
        repositories.atUriResolutionService,
        getCollectionPageUseCase,
        services.configService.getAtProtoCollections().collection,
        services.configService.getAtProtoCollections().marginCollection,
      ),
      getCollectionsUseCase: new GetCollectionsUseCase(
        repositories.collectionQueryRepository,
        services.profileService,
        services.identityResolutionService,
      ),
      searchCollectionsUseCase: new SearchCollectionsUseCase(
        repositories.collectionQueryRepository,
        services.profileService,
        services.identityResolutionService,
      ),
      getOpenCollectionsWithContributorUseCase:
        new GetOpenCollectionsWithContributorUseCase(
          repositories.collectionQueryRepository,
          services.profileService,
          services.identityResolutionService,
        ),
      getUrlStatusForMyLibraryUseCase: new GetUrlStatusForMyLibraryUseCase(
        repositories.cardRepository,
        repositories.cardQueryRepository,
        repositories.collectionQueryRepository,
        repositories.collectionRepository,
        services.profileService,
        services.eventPublisher,
      ),
      getLibrariesForUrlUseCase: new GetLibrariesForUrlUseCase(
        repositories.cardQueryRepository,
        services.profileService,
      ),
      getCollectionsForUrlUseCase: new GetCollectionsForUrlUseCase(
        repositories.collectionQueryRepository,
        services.profileService,
        repositories.collectionRepository,
      ),
      getNoteCardsForUrlUseCase: new GetNoteCardsForUrlUseCase(
        repositories.cardQueryRepository,
        services.profileService,
      ),

      // Feed use cases
      getGlobalFeedUseCase: new GetGlobalFeedUseCase(
        repositories.feedRepository,
        services.profileService,
        repositories.cardQueryRepository,
        repositories.collectionRepository,
      ),
      getGemActivityFeedUseCase: new GetGemActivityFeedUseCase(
        repositories.feedRepository,
        services.profileService,
        repositories.cardQueryRepository,
        repositories.collectionRepository,
        repositories.collectionQueryRepository,
      ),
      getFollowingFeedUseCase: new GetFollowingFeedUseCase(
        repositories.feedRepository,
        services.profileService,
        repositories.cardQueryRepository,
        repositories.collectionRepository,
      ),
      addActivityToFeedUseCase: new AddActivityToFeedUseCase(
        services.feedService,
        repositories.cardRepository,
        repositories.followsRepository,
        repositories.feedRepository,
      ),
      // Search use cases
      getSimilarUrlsForUrlUseCase: new GetSimilarUrlsForUrlUseCase(
        services.searchService,
      ),
      semanticSearchUrlsUseCase: new SemanticSearchUrlsUseCase(
        services.searchService,
        services.identityResolutionService,
      ),
      searchBskyPostsForUrlUseCase: new SearchBskyPostsForUrlUseCase(
        services.atProtoAgentService,
      ),
      searchAtProtoAccountsUseCase: new SearchAtProtoAccountsUseCase(
        services.atProtoAgentService,
      ),
      searchLeafletDocsForUrlUseCase: new SearchLeafletDocsForUrlUseCase(
        services.leafletSearchService,
        repositories.cardQueryRepository,
      ),
      // Notification use cases
      getMyNotificationsUseCase: new GetMyNotificationsUseCase(
        repositories.notificationRepository,
        services.profileService,
        repositories.cardQueryRepository,
        repositories.collectionRepository,
      ),
      getUnreadNotificationCountUseCase: new GetUnreadNotificationCountUseCase(
        repositories.notificationRepository,
      ),
      markNotificationsAsReadUseCase: new MarkNotificationsAsReadUseCase(
        repositories.notificationRepository,
      ),
      markAllNotificationsAsReadUseCase: new MarkAllNotificationsAsReadUseCase(
        repositories.notificationRepository,
      ),
    };
  }

  static createForWorker(
    repositories: Repositories,
    services: SharedServices,
  ): WorkerUseCases {
    // ========================================
    // LEVEL 1: Leaf use cases (no use case dependencies)
    // ========================================

    // Feed use cases
    const addActivityToFeedUseCase = new AddActivityToFeedUseCase(
      services.feedService,
      repositories.cardRepository,
      repositories.followsRepository,
      repositories.feedRepository,
    );

    // Search use cases
    const indexUrlForSearchUseCase = new IndexUrlForSearchUseCase(
      services.searchService,
    );

    // Notification use cases
    const createNotificationUseCase = new CreateNotificationUseCase(
      services.notificationService,
    );

    // Card library use cases
    const addUrlToLibraryUseCase = new AddUrlToLibraryUseCase(
      repositories.cardRepository,
      services.metadataService,
      services.cardLibraryService,
      services.cardCollectionService,
      services.eventPublisher,
    );

    const updateUrlCardAssociationsUseCase =
      new UpdateUrlCardAssociationsUseCase(
        repositories.cardRepository,
        services.cardLibraryService,
        services.cardCollectionService,
        services.eventPublisher,
      );

    const removeCardFromLibraryUseCase = new RemoveCardFromLibraryUseCase(
      repositories.cardRepository,
      services.cardLibraryService,
      services.eventPublisher,
    );

    // Collection use cases
    const createCollectionUseCase = new CreateCollectionUseCase(
      repositories.collectionRepository,
      services.collectionPublisher,
    );

    const updateCollectionUseCase = new UpdateCollectionUseCase(
      repositories.collectionRepository,
      services.collectionPublisher,
    );

    const deleteCollectionUseCase = new DeleteCollectionUseCase(
      repositories.collectionRepository,
      services.collectionPublisher,
    );

    // ========================================
    // LEVEL 2: Process use cases (depend on Level 1)
    // ========================================

    const processCardFirehoseEventUseCase = new ProcessCardFirehoseEventUseCase(
      repositories.atUriResolutionService,
      addUrlToLibraryUseCase,
      updateUrlCardAssociationsUseCase,
      removeCardFromLibraryUseCase,
      repositories.cardRepository,
    );

    const processCollectionFirehoseEventUseCase =
      new ProcessCollectionFirehoseEventUseCase(
        repositories.atUriResolutionService,
        createCollectionUseCase,
        updateCollectionUseCase,
        deleteCollectionUseCase,
      );

    const processCollectionLinkFirehoseEventUseCase =
      new ProcessCollectionLinkFirehoseEventUseCase(
        repositories.atUriResolutionService,
        updateUrlCardAssociationsUseCase,
      );

    const processCollectionLinkRemovalFirehoseEventUseCase =
      new ProcessCollectionLinkRemovalFirehoseEventUseCase(
        repositories.atUriResolutionService,
        updateUrlCardAssociationsUseCase,
      );

    const processMarginBookmarkFirehoseEventUseCase =
      new ProcessMarginBookmarkFirehoseEventUseCase(
        repositories.atUriResolutionService,
        addUrlToLibraryUseCase,
        removeCardFromLibraryUseCase,
      );

    const processMarginCollectionFirehoseEventUseCase =
      new ProcessMarginCollectionFirehoseEventUseCase(
        repositories.atUriResolutionService,
        createCollectionUseCase,
        updateCollectionUseCase,
        deleteCollectionUseCase,
      );

    const processMarginCollectionItemFirehoseEventUseCase =
      new ProcessMarginCollectionItemFirehoseEventUseCase(
        repositories.atUriResolutionService,
        updateUrlCardAssociationsUseCase,
      );

    // ========================================
    // LEVEL 3: Sync use cases (depend on Level 2)
    // ========================================

    const syncAccountDataUseCase = new SyncAccountDataUseCase(
      repositories.syncStatusRepository,
      services.atProtoRepoService,
      repositories.atUriResolutionService,
      processMarginBookmarkFirehoseEventUseCase,
      processMarginCollectionFirehoseEventUseCase,
      processMarginCollectionItemFirehoseEventUseCase,
    );

    // ========================================
    // Return all use cases
    // ========================================

    return {
      // Level 1
      addActivityToFeedUseCase,
      indexUrlForSearchUseCase,
      createNotificationUseCase,
      addUrlToLibraryUseCase,
      updateUrlCardAssociationsUseCase,
      removeCardFromLibraryUseCase,
      createCollectionUseCase,
      updateCollectionUseCase,
      deleteCollectionUseCase,
      // Level 2
      processCardFirehoseEventUseCase,
      processCollectionFirehoseEventUseCase,
      processCollectionLinkFirehoseEventUseCase,
      processCollectionLinkRemovalFirehoseEventUseCase,
      processMarginBookmarkFirehoseEventUseCase,
      processMarginCollectionFirehoseEventUseCase,
      processMarginCollectionItemFirehoseEventUseCase,
      // Level 3
      syncAccountDataUseCase,
    };
  }
}
