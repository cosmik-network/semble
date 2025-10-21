import {
  QueryClient,
  CardClient,
  CollectionClient,
  UserClient,
  FeedClient,
} from './clients';
import type {
  // Request types
  AddUrlToLibraryRequest,
  AddCardToLibraryRequest,
  AddCardToCollectionRequest,
  UpdateNoteCardRequest,
  UpdateUrlCardAssociationsRequest,
  RemoveCardFromLibraryRequest,
  RemoveCardFromCollectionRequest,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  DeleteCollectionRequest,
  LoginWithAppPasswordRequest,
  InitiateOAuthSignInRequest,
  CompleteOAuthSignInRequest,
  RefreshAccessTokenRequest,
  GenerateExtensionTokensRequest,
  GetMyUrlCardsParams,
  GetCollectionPageParams,
  GetCollectionPageByAtUriParams,
  GetMyCollectionsParams,
  GetGlobalFeedParams,
  // Response types
  AddUrlToLibraryResponse,
  AddCardToLibraryResponse,
  AddCardToCollectionResponse,
  UpdateNoteCardResponse,
  UpdateUrlCardAssociationsResponse,
  RemoveCardFromLibraryResponse,
  RemoveCardFromCollectionResponse,
  CreateCollectionResponse,
  UpdateCollectionResponse,
  DeleteCollectionResponse,
  LoginWithAppPasswordResponse,
  InitiateOAuthSignInResponse,
  CompleteOAuthSignInResponse,
  RefreshAccessTokenResponse,
  GenerateExtensionTokensResponse,
  GetUrlMetadataResponse,
  GetUrlCardViewResponse,
  GetLibrariesForCardResponse,
  GetCollectionPageResponse,
  GetGlobalFeedResponse,
  GetCollectionsResponse,
  GetCollectionsParams,
  GetUrlCardsParams,
  GetUrlCardsResponse,
  GetProfileResponse,
  GetProfileParams,
  GetUrlStatusForMyLibraryParams,
  GetUrlStatusForMyLibraryResponse,
  GetLibrariesForUrlParams,
  GetLibrariesForUrlResponse,
  GetNoteCardsForUrlParams,
  GetNoteCardsForUrlResponse,
  GetCollectionsForUrlParams,
  GetCollectionsForUrlResponse,
} from '@semble/types';

// Main API Client class using composition
export class ApiClient {
  private queryClient: QueryClient;
  private cardClient: CardClient;
  private collectionClient: CollectionClient;
  private userClient: UserClient;
  private feedClient: FeedClient;

  constructor(private baseUrl: string) {
    this.queryClient = new QueryClient(baseUrl);
    this.cardClient = new CardClient(baseUrl);
    this.collectionClient = new CollectionClient(baseUrl);
    this.userClient = new UserClient(baseUrl);
    this.feedClient = new FeedClient(baseUrl);
  }

  // Query operations - delegate to QueryClient
  async getUrlMetadata(url: string): Promise<GetUrlMetadataResponse> {
    return this.queryClient.getUrlMetadata(url);
  }

  async getMyUrlCards(
    params?: GetMyUrlCardsParams,
  ): Promise<GetUrlCardsResponse> {
    return this.queryClient.getMyUrlCards(params);
  }

  async getUrlCards(params: GetUrlCardsParams): Promise<GetUrlCardsResponse> {
    return this.queryClient.getUserUrlCards(params);
  }

  async getUrlCardView(cardId: string): Promise<GetUrlCardViewResponse> {
    return this.queryClient.getUrlCardView(cardId);
  }

  async getLibrariesForCard(
    cardId: string,
  ): Promise<GetLibrariesForCardResponse> {
    return this.queryClient.getLibrariesForCard(cardId);
  }

  async getMyProfile(): Promise<GetProfileResponse> {
    return this.queryClient.getMyProfile();
  }

  async getProfile(params: GetProfileParams): Promise<GetProfileResponse> {
    return this.queryClient.getUserProfile(params);
  }

  async getCollectionPage(
    collectionId: string,
    params?: GetCollectionPageParams,
  ): Promise<GetCollectionPageResponse> {
    return this.queryClient.getCollectionPage(collectionId, params);
  }

  async getCollectionPageByAtUri(
    params: GetCollectionPageByAtUriParams,
  ): Promise<GetCollectionPageResponse> {
    return this.queryClient.getCollectionPageByAtUri(params);
  }

  async getMyCollections(
    params?: GetMyCollectionsParams,
  ): Promise<GetCollectionsResponse> {
    return this.queryClient.getMyCollections(params);
  }

  async getCollections(
    params: GetCollectionsParams,
  ): Promise<GetCollectionsResponse> {
    return this.queryClient.getUserCollections(params);
  }

  async getUrlStatusForMyLibrary(
    params: GetUrlStatusForMyLibraryParams,
  ): Promise<GetUrlStatusForMyLibraryResponse> {
    return this.queryClient.getUrlStatusForMyLibrary(params);
  }

  async getLibrariesForUrl(
    params: GetLibrariesForUrlParams,
  ): Promise<GetLibrariesForUrlResponse> {
    return this.queryClient.getLibrariesForUrl(params);
  }

  async getNoteCardsForUrl(
    params: GetNoteCardsForUrlParams,
  ): Promise<GetNoteCardsForUrlResponse> {
    return this.queryClient.getNoteCardsForUrl(params);
  }

  async getCollectionsForUrl(
    params: GetCollectionsForUrlParams,
  ): Promise<GetCollectionsForUrlResponse> {
    return this.queryClient.getCollectionsForUrl(params);
  }

  // Card operations - delegate to CardClient
  async addUrlToLibrary(
    request: AddUrlToLibraryRequest,
  ): Promise<AddUrlToLibraryResponse> {
    return this.cardClient.addUrlToLibrary(request);
  }

  async addCardToLibrary(
    request: AddCardToLibraryRequest,
  ): Promise<AddCardToLibraryResponse> {
    return this.cardClient.addCardToLibrary(request);
  }

  async addCardToCollection(
    request: AddCardToCollectionRequest,
  ): Promise<AddCardToCollectionResponse> {
    return this.cardClient.addCardToCollection(request);
  }

  async updateNoteCard(
    request: UpdateNoteCardRequest,
  ): Promise<UpdateNoteCardResponse> {
    return this.cardClient.updateNoteCard(request);
  }

  async updateUrlCardAssociations(
    request: UpdateUrlCardAssociationsRequest,
  ): Promise<UpdateUrlCardAssociationsResponse> {
    return this.cardClient.updateUrlCardAssociations(request);
  }

  async removeCardFromLibrary(
    request: RemoveCardFromLibraryRequest,
  ): Promise<RemoveCardFromLibraryResponse> {
    return this.cardClient.removeCardFromLibrary(request);
  }

  async removeCardFromCollection(
    request: RemoveCardFromCollectionRequest,
  ): Promise<RemoveCardFromCollectionResponse> {
    return this.cardClient.removeCardFromCollection(request);
  }

  // Collection operations - delegate to CollectionClient
  async createCollection(
    request: CreateCollectionRequest,
  ): Promise<CreateCollectionResponse> {
    return this.collectionClient.createCollection(request);
  }

  async updateCollection(
    request: UpdateCollectionRequest,
  ): Promise<UpdateCollectionResponse> {
    return this.collectionClient.updateCollection(request);
  }

  async deleteCollection(
    request: DeleteCollectionRequest,
  ): Promise<DeleteCollectionResponse> {
    return this.collectionClient.deleteCollection(request);
  }

  // User operations - delegate to UserClient
  async loginWithAppPassword(
    request: LoginWithAppPasswordRequest,
  ): Promise<LoginWithAppPasswordResponse> {
    return this.userClient.loginWithAppPassword(request);
  }

  async initiateOAuthSignIn(
    request?: InitiateOAuthSignInRequest,
  ): Promise<InitiateOAuthSignInResponse> {
    return this.userClient.initiateOAuthSignIn(request);
  }

  async completeOAuthSignIn(
    request: CompleteOAuthSignInRequest,
  ): Promise<CompleteOAuthSignInResponse> {
    return this.userClient.completeOAuthSignIn(request);
  }

  async refreshAccessToken(
    request: RefreshAccessTokenRequest,
  ): Promise<RefreshAccessTokenResponse> {
    return this.userClient.refreshAccessToken(request);
  }

  async generateExtensionTokens(
    request?: GenerateExtensionTokensRequest,
  ): Promise<GenerateExtensionTokensResponse> {
    return this.userClient.generateExtensionTokens(request);
  }

  async logout(): Promise<{ success: boolean; message: string }> {
    return this.userClient.logout();
  }

  // Feed operations - delegate to FeedClient
  async getGlobalFeed(
    params?: GetGlobalFeedParams,
  ): Promise<GetGlobalFeedResponse> {
    return this.feedClient.getGlobalFeed(params);
  }
}

// Re-export types for convenience
export * from '@semble/types';

// Factory functions for different client types
export const createApiClient = () => {
  return new ApiClient(
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3000',
  );
};

export const createServerApiClient = () => {
  return new ApiClient(process.env.API_BASE_URL || 'http://127.0.0.1:3000');
};

// Default client instance for backward compatibility
export const apiClient = createApiClient();
