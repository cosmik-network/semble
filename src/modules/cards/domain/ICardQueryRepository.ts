import { CardTypeEnum } from './value-objects/CardType';
import { UrlType } from './value-objects/UrlType';

export interface CardQueryOptions {
  page: number;
  limit: number;
  sortBy: CardSortField;
  sortOrder: SortOrder;
  urlType?: UrlType;
}

export interface PaginatedQueryResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
}

export enum CardSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  LIBRARY_COUNT = 'libraryCount',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

// Simplified DTO for cards in a collection (no collections array to avoid circular data)
export interface UrlCardView {
  id: string;
  type: CardTypeEnum.URL;
  url: string;
  uri?: string;
  cardContent: {
    url: string;
    title?: string;
    description?: string;
    author?: string;
    publishedDate?: Date;
    siteName?: string;
    imageUrl?: string;
    type?: string;
    retrievedAt?: Date;
    doi?: string;
    isbn?: string;
  };
  libraryCount: number;
  urlLibraryCount: number;
  urlInLibrary?: boolean;
  createdAt: Date;
  updatedAt: Date;
  authorId: string; // NEW - needed to enrich with author profile
  note?: {
    id: string;
    text: string;
  };
}

export type CollectionCardQueryResultDTO = UrlCardView;
// Raw data from repository - minimal, just what's stored
export interface WithCollections {
  collections: {
    id: string;
    name: string;
    authorId: string;
    accessType: string;
  }[];
}

export interface WithLibraries {
  libraries: { userId: string }[];
}
export type UrlCardQueryResultDTO = UrlCardView & WithCollections;

// DTO for single URL card view with library and collection info
export type UrlCardViewDTO = UrlCardView & WithCollections & WithLibraries;

// Repository returns card data - will be enriched with user profile in use case
export interface LibraryForUrlDTO {
  userId: string;
  card: {
    id: string;
    url: string;
    uri?: string;
    cardContent: {
      url: string;
      title?: string;
      description?: string;
      author?: string;
      publishedDate?: Date;
      siteName?: string;
      imageUrl?: string;
      type?: string;
      retrievedAt?: Date;
      doi?: string;
      isbn?: string;
    };
    libraryCount: number;
    urlLibraryCount: number;
    urlInLibrary?: boolean;
    createdAt: Date;
    updatedAt: Date;
    note?: {
      id: string;
      text: string;
    };
  };
  // Note: userId is the card author in this context (it's their card in their library)
}

// Raw repository DTO - what the repository returns (not enriched)
export interface NoteCardForUrlRawDTO {
  id: string;
  note: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Public DTO - what the use case returns (enriched with author profile)
export interface NoteCardForUrlDTO {
  id: string;
  note: string;
  author: {
    id: string;
    name: string;
    handle: string;
    avatarUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ICardQueryRepository {
  getUrlCardsOfUser(
    userId: string,
    options: CardQueryOptions,
    callingUserId?: string,
  ): Promise<PaginatedQueryResult<UrlCardQueryResultDTO>>;

  getCardsInCollection(
    collectionId: string,
    options: CardQueryOptions,
    callingUserId?: string,
  ): Promise<PaginatedQueryResult<CollectionCardQueryResultDTO>>;

  getUrlCardView(
    cardId: string,
    callingUserId?: string,
  ): Promise<UrlCardViewDTO | null>;

  getUrlCardBasic(
    cardId: string,
    callingUserId?: string,
  ): Promise<UrlCardView | null>;

  getLibrariesForCard(cardId: string): Promise<string[]>;

  getLibrariesForUrl(
    url: string,
    options: CardQueryOptions,
  ): Promise<PaginatedQueryResult<LibraryForUrlDTO>>;

  getNoteCardsForUrl(
    url: string,
    options: CardQueryOptions,
  ): Promise<PaginatedQueryResult<NoteCardForUrlRawDTO>>;

  getBatchUrlCardViews(
    cardIds: string[],
    callingUserId?: string,
  ): Promise<Map<string, UrlCardView>>;
}
