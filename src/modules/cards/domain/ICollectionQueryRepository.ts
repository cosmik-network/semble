export interface CollectionQueryOptions {
  page: number;
  limit: number;
  sortBy: CollectionSortField;
  sortOrder: SortOrder;
  searchText?: string;
}

export interface PaginatedQueryResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
}

export enum CollectionSortField {
  NAME = 'name',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  CARD_COUNT = 'cardCount',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export interface CollectionQueryResultDTO {
  id: string;
  uri?: string;
  name: string;
  description?: string;
  accessType: string;
  updatedAt: Date;
  createdAt: Date;
  cardCount: number;
  authorId: string;
}

export interface CollectionContainingCardDTO {
  id: string;
  uri?: string;
  name: string;
  description?: string;
}

// Raw repository DTO - what the repository returns (not enriched)
export interface CollectionForUrlRawDTO {
  id: string;
  uri?: string;
  name: string;
  description?: string;
  accessType: string;
  authorId: string;
}

// Public DTO - what the use case returns (enriched with author profile)
export interface CollectionForUrlDTO {
  id: string;
  uri?: string;
  name: string;
  description?: string;
  accessType: string;
  author: {
    id: string;
    name: string;
    handle: string;
    avatarUrl?: string;
  };
}

export interface CollectionForUrlQueryOptions {
  page: number;
  limit: number;
  sortBy: CollectionSortField;
  sortOrder: SortOrder;
}

export interface SearchCollectionsOptions {
  page: number;
  limit: number;
  sortBy: CollectionSortField;
  sortOrder: SortOrder;
  searchText?: string;
  authorId?: string; // Filter by author DID
  accessType?: string; // Filter by access type (OPEN or CLOSED)
}

export interface ICollectionQueryRepository {
  findByCreator(
    curatorId: string,
    options: CollectionQueryOptions,
  ): Promise<PaginatedQueryResult<CollectionQueryResultDTO>>;

  getCollectionsContainingCardForUser(
    cardId: string,
    curatorId: string,
  ): Promise<CollectionContainingCardDTO[]>;

  getCollectionsWithUrl(
    url: string,
    options: CollectionForUrlQueryOptions,
  ): Promise<PaginatedQueryResult<CollectionForUrlRawDTO>>;

  searchCollections(
    options: SearchCollectionsOptions,
  ): Promise<PaginatedQueryResult<CollectionQueryResultDTO>>;
}
