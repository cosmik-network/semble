// Unified User/Profile interface - used across all endpoints
export interface User {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  description?: string;
  isFollowing?: boolean; // Whether the calling user follows this user
}

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
