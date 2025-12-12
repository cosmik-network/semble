// Base interfaces for common parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SortingParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedSortedParams
  extends PaginationParams,
    SortingParams {}

// Command request types
export interface AddUrlToLibraryRequest {
  url: string;
  note?: string;
  collectionIds?: string[];
  viaCardId?: string;
}

export interface AddCardToLibraryRequest {
  cardId: string;
  collectionIds?: string[];
}

export interface AddCardToCollectionRequest {
  cardId: string;
  collectionIds: string[];
}

export interface UpdateNoteCardRequest {
  cardId: string;
  note: string;
}

export interface UpdateUrlCardAssociationsRequest {
  cardId: string;
  note?: string;
  addToCollections?: string[];
  removeFromCollections?: string[];
  viaCardId?: string;
}

export interface RemoveCardFromLibraryRequest {
  cardId: string;
}

export interface RemoveCardFromCollectionRequest {
  cardId: string;
  collectionIds: string[];
}

export interface CreateCollectionRequest {
  name: string;
  description?: string;
}

export interface UpdateCollectionRequest {
  collectionId: string;
  name: string;
  description?: string;
}

export interface DeleteCollectionRequest {
  collectionId: string;
}

// Query parameters
export interface GetMyUrlCardsParams extends PaginatedSortedParams {}

export interface GetUrlCardsParams extends PaginatedSortedParams {
  identifier: string; // Can be DID or handle
}

export interface GetCollectionPageParams extends PaginatedSortedParams {}

export interface GetMyCollectionsParams extends PaginatedSortedParams {
  searchText?: string;
}

export interface GetCollectionsParams extends PaginatedSortedParams {
  identifier: string; // Can be DID or handle
  searchText?: string;
}

export interface GetCollectionPageByAtUriParams extends PaginatedSortedParams {
  handle: string;
  recordKey: string;
}

export interface GetGlobalFeedParams extends PaginationParams {
  beforeActivityId?: string; // For cursor-based pagination
}

export interface LoginWithAppPasswordRequest {
  identifier: string;
  appPassword: string;
}

export interface InitiateOAuthSignInRequest {
  handle?: string;
}

export interface CompleteOAuthSignInRequest {
  code: string;
  state: string;
  iss: string;
}

export interface RefreshAccessTokenRequest {
  refreshToken: string;
}

export interface GenerateExtensionTokensRequest {
  // No additional parameters needed - user is authenticated via middleware
}

export interface GetProfileParams {
  identifier: string; // Can be DID or handle
}

export interface GetUrlStatusForMyLibraryParams {
  url: string;
}

export interface GetLibrariesForUrlParams extends PaginatedSortedParams {
  url: string;
}

export interface GetNoteCardsForUrlParams extends PaginatedSortedParams {
  url: string;
}

export interface GetCollectionsForUrlParams extends PaginatedSortedParams {
  url: string;
}

export interface GetSimilarUrlsForUrlParams extends PaginatedSortedParams {
  url: string;
  threshold?: number;
}

export interface GetGemActivityFeedParams extends PaginationParams {
  beforeActivityId?: string; // For cursor-based pagination
}

export interface SearchCollectionsParams extends PaginatedSortedParams {
  searchText?: string;
}

// Notification request types
export interface GetMyNotificationsParams extends PaginatedSortedParams {
  unreadOnly?: boolean;
}

export interface MarkNotificationsAsReadRequest {
  notificationIds: string[];
}
