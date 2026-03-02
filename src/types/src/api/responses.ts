import {
  User,
  ContributorUser,
  Pagination,
  CardSorting,
  CollectionSorting,
  FeedPagination,
} from './common';
import { CollectionAccessType } from './requests';

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
  uri?: string;
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
  accessType?: CollectionAccessType;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
  isFollowing?: boolean; // Whether the calling user follows this collection
  followerCount?: number; // Number of users following this collection
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

export interface GetCollectionPageResponse extends Collection {
  urlCards: UrlCard[];
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

export interface SemanticSearchUrlsResponse {
  urls: UrlView[];
  pagination: Pagination;
}

// Bluesky search response types
export interface PostView {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
    associated?: {
      chat?: {
        allowIncoming: 'all' | 'none' | 'following';
      };
    };
    viewer?: {
      muted?: boolean;
      blockedBy?: boolean;
      blocking?: string;
      following?: string;
      followedBy?: string;
    };
    labels?: any[];
    createdAt?: string;
  };
  record: { [key: string]: unknown };
  embed?: any;
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  quoteCount?: number;
  indexedAt: string;
  viewer?: {
    repost?: string;
    like?: string;
    threadMuted?: boolean;
    replyDisabled?: boolean;
    embeddingDisabled?: boolean;
    pinned?: boolean;
  };
  labels?: any[];
  threadgate?: any;
}

export interface SearchBskyPostsForUrlResponse {
  cursor?: string;
  hitsTotal?: number;
  posts: PostView[];
}

// AtProto account search response types
export interface ProfileView {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  associated?: {
    chat?: {
      allowIncoming: 'all' | 'none' | 'following';
    };
  };
  indexedAt?: string;
  createdAt?: string;
  viewer?: {
    muted?: boolean;
    blockedBy?: boolean;
    blocking?: string;
    following?: string;
    followedBy?: string;
  };
  labels?: any[];
  verification?: any;
  status?: any;
}

export interface SearchAtProtoAccountsResponse {
  cursor?: string;
  actors: ProfileView[];
}

export interface SearchLeafletDocsForUrlResponse {
  urls: UrlView[];
  cursor?: string;
  total: number;
}

// Notification types
export enum NotificationType {
  USER_ADDED_YOUR_CARD = 'USER_ADDED_YOUR_CARD',
  USER_ADDED_YOUR_BSKY_POST = 'USER_ADDED_YOUR_BSKY_POST',
  USER_ADDED_YOUR_COLLECTION = 'USER_ADDED_YOUR_COLLECTION',
  USER_ADDED_TO_YOUR_COLLECTION = 'USER_ADDED_TO_YOUR_COLLECTION',
  USER_FOLLOWED_YOU = 'USER_FOLLOWED_YOU',
  USER_FOLLOWED_YOUR_COLLECTION = 'USER_FOLLOWED_YOUR_COLLECTION',
}

export interface NotificationItem {
  id: string;
  user: User;
  card?: UrlCard; // Optional for follow notifications
  createdAt: string;
  collections?: Collection[]; // Optional for follow notifications
  type: NotificationType;
  read: boolean;
  // Follow notification specific fields
  followTargetType?: 'USER' | 'COLLECTION';
  followTargetId?: string; // Collection ID if following a collection
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

// Follow response types
export interface FollowTargetResponse {
  followId: string;
}

// Follow query response types
export interface GetFollowingUsersResponse {
  users: User[];
  pagination: Pagination;
}

export interface GetFollowersResponse {
  users: User[];
  pagination: Pagination;
}

export interface GetFollowingCollectionsResponse {
  collections: Collection[];
  pagination: Pagination;
}

export interface GetCollectionFollowersResponse {
  users: User[];
  pagination: Pagination;
}

// Follow count response types
export interface GetFollowCountResponse {
  count: number;
}

// Contributor response types
export interface GetCollectionContributorsResponse {
  users: ContributorUser[];
  pagination: Pagination;
}

// Connection response types
export interface CreateConnectionResponse {
  connectionId: string;
}

export interface UpdateConnectionResponse {
  connectionId: string;
}

export interface DeleteConnectionResponse {
  connectionId: string;
}

export interface ConnectionForUrl {
  connection: {
    id: string;
    type?: string;
    note?: string;
    createdAt: string;
    updatedAt: string;
    curator: User;
  };
  url: UrlView;
}

export interface ConnectionSorting {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface GetForwardConnectionsForUrlResponse {
  connections: ConnectionForUrl[];
  pagination: Pagination;
  sorting: ConnectionSorting;
}

export interface GetBackwardConnectionsForUrlResponse {
  connections: ConnectionForUrl[];
  pagination: Pagination;
  sorting: ConnectionSorting;
}

// Search URLs response types
export interface SearchUrlsResponse {
  urls: UrlView[];
  pagination: Pagination;
  sorting: CardSorting;
}

// Get connections response types
export interface ConnectionWithSourceAndTarget {
  connection: {
    id: string;
    type?: string;
    note?: string;
    createdAt: string;
    updatedAt: string;
  };
  source: UrlView;
  target: UrlView;
}

export interface GetConnectionsResponse {
  connections: ConnectionWithSourceAndTarget[];
  pagination: Pagination;
  sorting: ConnectionSorting;
}
