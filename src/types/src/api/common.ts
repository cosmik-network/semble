// ATProto Label interface
export interface Label {
  $type?: 'com.atproto.label.defs#label';
  /** The AT Protocol version of the label object. */
  ver?: number;
  /** DID of the actor who created this label. */
  src: string;
  /** AT URI of the record, repository (account), or other resource that this label applies to. */
  uri: string;
  /** Optionally, CID specifying the specific version of 'uri' resource this label applies to. */
  cid?: string;
  /** The short string name of the value or type of this label. */
  val: string;
  /** If true, this is a negation label, overwriting a previous label. */
  neg?: boolean;
  /** Timestamp when this label was created. */
  cts: string;
  /** Timestamp at which this label expires (no longer applies). */
  exp?: string;
  /** Signature of dag-cbor encoded label. */
  sig?: Uint8Array;
}

// Unified User/Profile interface - used across all endpoints
export interface User {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  bannerUrl?: string;
  description?: string;
  isFollowing?: boolean; // Whether the calling user follows this user
  followsYou?: boolean; // Whether this user follows the calling user
  followerCount?: number; // Number of users following this user
  followingCount?: number; // Number of users this user follows
  followedCollectionsCount?: number; // Number of collections this user follows
  urlCardCount?: number; // Number of URL cards authored by this user
  collectionCount?: number; // Number of collections created by this user
  connectionCount?: number; // Total number of connections created by this user
  connectionsByType?: { total: number; [type: string]: number }; // Breakdown of connections by type
  labels?: Label[]; // Moderation labels from ATProto
}

// Extended User interface for contributors with contribution count
export interface ContributorUser extends User {
  contributionCount: number; // Number of cards this user contributed to the collection
}

// Type alias for inline profile objects (without isFollowing)
// Used for nested author objects in collections, cards, etc.
export type UserProfileDTO = Omit<User, 'isFollowing'>;

// Type alias for minimal profile objects (without description)
// Used for card authors in collection pages and other compact displays
export type MinimalUserProfile = Omit<UserProfileDTO, 'description'>;

// Base pagination interface
export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
  limit: number;
}

// Extended pagination with cursor for feeds
export interface FeedPagination extends Pagination {
  nextCursor?: string;
}

// Sort order enum
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

// Sort field enums
export enum CardSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  LIBRARY_COUNT = 'libraryCount',
}

export enum CollectionSortField {
  NAME = 'name',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  CARD_COUNT = 'cardCount',
  ADDED_AT = 'addedAt',
}

// Base sorting interface
export interface BaseSorting {
  sortOrder: SortOrder;
}

// Specific sorting interfaces
export interface CardSorting extends BaseSorting {
  sortBy: CardSortField;
}

export interface CollectionSorting extends BaseSorting {
  sortBy: CollectionSortField;
}
