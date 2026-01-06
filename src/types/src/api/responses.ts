import {
  User,
  Pagination,
  CardSorting,
  CollectionSorting,
  FeedPagination,
} from './common';

// Command response types
export interface AddUrlToLibraryResponse {
  urlCardId: string;
  noteCardId?: string;
}

export interface AddCardToLibraryResponse {
  cardId: string;
}

export interface AddCardToCollectionResponse {
  cardId: string;
}

export interface UpdateNoteCardResponse {
  cardId: string;
}

export interface UpdateUrlCardAssociationsResponse {
  urlCardId: string;
  noteCardId?: string;
  addedToCollections: string[];
  removedFromCollections: string[];
}

export interface RemoveCardFromLibraryResponse {
  cardId: string;
}

export interface RemoveCardFromCollectionResponse {
  cardId: string;
}

export interface CreateCollectionResponse {
  collectionId: string;
}

export interface UpdateCollectionResponse {
  collectionId: string;
}

export interface DeleteCollectionResponse {
  collectionId: string;
}

// Query response types
export interface UrlMetadata {
  url: string;
  title?: string;
  description?: string;
  author?: string;
  publishedDate?: string;
  siteName?: string;
  imageUrl?: string;
  type?: string;
  retrievedAt?: string;
  doi?: string;
  isbn?: string;
}

export interface GetUrlMetadataResponse {
  metadata: UrlMetadata;
}

// Unified UrlCard interface - base for all card responses
export interface UrlCard {
  id: string;
  type: 'URL';
  url: string;
  cardContent: UrlMetadata;
  libraryCount: number;
  urlLibraryCount: number;
  urlInLibrary?: boolean;
  createdAt: string;
  updatedAt: string;
  author: User;
  note?: {
    id: string;
    text: string;
  };
}

// Unified Collection interface - used across all endpoints
export interface Collection {
  id: string;
  uri?: string;
  name: string;
  author: User;
  description?: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

// Context-specific variations
export interface UrlCardWithCollections extends UrlCard {
  collections: Collection[];
}

export interface UrlCardWithLibraries extends UrlCard {
  libraries: User[];
}

export interface UrlCardWithCollectionsAndLibraries extends UrlCard {
  collections: Collection[];
  libraries: User[];
}

export interface GetUrlCardViewResponse
  extends UrlCardWithCollectionsAndLibraries {}

export interface GetLibrariesForCardResponse {
  cardId: string;
  users: User[];
  totalCount: number;
}

export interface GetProfileResponse extends User {}

export interface GetUrlCardsResponse {
  cards: UrlCard[];
  pagination: Pagination;
  sorting: CardSorting;
}

export interface GetCollectionPageResponse {
  id: string;
  uri?: string;
  name: string;
  description?: string;
  author: User;
  urlCards: UrlCard[];
  cardCount: number;
  createdAt: string;
  updatedAt: string;
  pagination: Pagination;
  sorting: CardSorting;
}

export interface GetCollectionsResponse {
  collections: Collection[];
  pagination: Pagination;
  sorting: CollectionSorting;
}

export interface LoginWithAppPasswordResponse {
  accessToken: string;
  refreshToken: string;
}

export interface InitiateOAuthSignInResponse {
  authUrl: string;
}

export interface CompleteOAuthSignInResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshAccessTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface GenerateExtensionTokensResponse {
  accessToken: string;
  refreshToken: string;
}

// Feed response types
export interface FeedItem {
  id: string;
  user: User;
  card: UrlCard;
  createdAt: Date;
  collections: Collection[];
}

export interface GetGlobalFeedResponse {
  activities: FeedItem[];
  pagination: FeedPagination;
}

export interface GetUrlStatusForMyLibraryResponse {
  card?: UrlCard;
  collections?: Collection[];
}

export interface GetLibrariesForUrlResponse {
  libraries: {
    user: User;
    card: UrlCard;
  }[];
  pagination: Pagination;
  sorting: CardSorting;
}

export interface GetNoteCardsForUrlResponse {
  notes: {
    id: string;
    note: string;
    author: User;
    createdAt: string;
    updatedAt: string;
  }[];
  pagination: Pagination;
  sorting: CardSorting;
}

export interface GetCollectionsForUrlResponse {
  collections: Collection[];
  pagination: Pagination;
  sorting: CollectionSorting;
}

// Search response types
export interface UrlView {
  url: string;
  metadata: UrlMetadata;
  urlLibraryCount: number;
  urlInLibrary?: boolean;
}

export interface GetSimilarUrlsForUrlResponse {
  urls: UrlView[];
  pagination: Pagination;
}

// Notification types
export enum NotificationType {
  USER_ADDED_YOUR_CARD = 'USER_ADDED_YOUR_CARD',
  USER_ADDED_YOUR_BSKY_POST = 'USER_ADDED_YOUR_BSKY_POST',
  USER_ADDED_YOUR_COLLECTION = 'USER_ADDED_YOUR_COLLECTION',
}

export interface NotificationItem {
  id: string;
  user: User;
  card: UrlCard;
  createdAt: string;
  collections: Collection[];
  type: NotificationType;
  read: boolean;
}

export interface GetMyNotificationsResponse {
  notifications: NotificationItem[];
  pagination: Pagination;
  unreadCount: number;
}

export interface GetUnreadNotificationCountResponse {
  unreadCount: number;
}

export interface MarkNotificationsAsReadResponse {
  markedCount: number;
}

export interface MarkAllNotificationsAsReadResponse {
  markedCount: number;
}
