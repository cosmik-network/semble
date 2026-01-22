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

// URL Type enum for filtering
export enum UrlType {
  ARTICLE = 'article',
  LINK = 'link',
  BOOK = 'book',
  RESEARCH = 'research',
  AUDIO = 'audio',
  VIDEO = 'video',
  SOCIAL = 'social',
  EVENT = 'event',
  SOFTWARE = 'software',
}

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
export interface GetMyUrlCardsParams extends PaginatedSortedParams {
  urlType?: UrlType;
}

export interface GetUrlCardsParams extends PaginatedSortedParams {
  identifier: string; // Can be DID or handle
  urlType?: UrlType;
}

export interface GetCollectionPageParams extends PaginatedSortedParams {
  urlType?: UrlType;
}

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
  urlType?: UrlType;
}

export interface GetGlobalFeedParams extends PaginationParams {
  beforeActivityId?: string; // For cursor-based pagination
  urlType?: UrlType; // Filter by URL type
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
  urlType?: string;
}

export interface SemanticSearchUrlsParams extends PaginatedSortedParams {
  query: string;
  threshold?: number;
  urlType?: string;
  identifier?: string; // Can be DID or handle
}

export interface SearchBskyPostsForUrlParams {
  q: string;
  sort?: 'top' | 'latest' | string;
  since?: string;
  until?: string;
  mentions?: string;
  author?: string;
  lang?: string;
  domain?: string;
  url?: string;
  tag?: string[];
  limit?: number;
  cursor?: string;
}

export interface SearchAtProtoAccountsParams {
  /** DEPRECATED: use 'q' instead. */
  term?: string;
  /** Search query string. Syntax, phrase, boolean, and faceting is unspecified, but Lucene query syntax is recommended. */
  q?: string;
  limit?: number;
  cursor?: string;
}

export interface SearchLeafletDocsForUrlParams {
  url: string;
  limit?: number;
  cursor?: string;
}

export interface GetGemActivityFeedParams extends PaginationParams {
  // Removed beforeActivityId since we're using page-based pagination
  urlType?: UrlType; // Filter by URL type
}

export interface SearchCollectionsParams extends PaginatedSortedParams {
  searchText?: string;
  identifier?: string; // Can be DID or handle
  accessType?: 'OPEN' | 'CLOSED';
}

// Notification request types
export interface GetMyNotificationsParams extends PaginatedSortedParams {
  unreadOnly?: boolean;
}

export interface MarkNotificationsAsReadRequest {
  notificationIds: string[];
}
