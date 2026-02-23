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
