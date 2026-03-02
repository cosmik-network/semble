import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  ICardQueryRepository,
  CardQueryOptions,
  PaginatedQueryResult,
  UrlCardQueryResultDTO,
  CollectionCardQueryResultDTO,
  UrlCardViewDTO,
  LibraryForUrlDTO,
  NoteCardForUrlRawDTO,
  UrlCardView,
  UrlLibraryInfo,
  SearchUrlsOptions,
  UrlSearchResultDTO,
} from '../../domain/ICardQueryRepository';
import { UrlCardQueryService } from './query-services/UrlCardQueryService';
import { CollectionCardQueryService } from './query-services/CollectionCardQueryService';
import { LibraryQueryService } from './query-services/LibraryQueryService';
import { NoteCardQueryService } from './query-services/NoteCardQueryService';

export class DrizzleCardQueryRepository implements ICardQueryRepository {
  private urlCardQueryService: UrlCardQueryService;
  private collectionCardQueryService: CollectionCardQueryService;
  private libraryQueryService: LibraryQueryService;
  private noteCardQueryService: NoteCardQueryService;

  constructor(private db: PostgresJsDatabase) {
    this.urlCardQueryService = new UrlCardQueryService(db);
    this.collectionCardQueryService = new CollectionCardQueryService(db);
    this.libraryQueryService = new LibraryQueryService(db);
    this.noteCardQueryService = new NoteCardQueryService(db);
  }

  async getUrlCardsOfUser(
    userId: string,
    options: CardQueryOptions,
    callingUserId?: string,
  ): Promise<PaginatedQueryResult<UrlCardQueryResultDTO>> {
    return this.urlCardQueryService.getUrlCardsOfUser(
      userId,
      options,
      callingUserId,
    );
  }

  async getCardsInCollection(
    collectionId: string,
    options: CardQueryOptions,
    callingUserId?: string,
  ): Promise<PaginatedQueryResult<CollectionCardQueryResultDTO>> {
    return this.collectionCardQueryService.getCardsInCollection(
      collectionId,
      options,
      callingUserId,
    );
  }

  async getUrlCardView(
    cardId: string,
    callingUserId?: string,
  ): Promise<UrlCardViewDTO | null> {
    return this.urlCardQueryService.getUrlCardView(cardId, callingUserId);
  }

  async getUrlCardBasic(
    cardId: string,
    callingUserId?: string,
  ): Promise<UrlCardView | null> {
    return this.urlCardQueryService.getUrlCardBasic(cardId, callingUserId);
  }

  async getLibrariesForCard(cardId: string): Promise<string[]> {
    return this.libraryQueryService.getLibrariesForCard(cardId);
  }

  async getLibrariesForUrl(
    url: string,
    options: CardQueryOptions,
  ): Promise<PaginatedQueryResult<LibraryForUrlDTO>> {
    return this.urlCardQueryService.getLibrariesForUrl(url, options);
  }

  async getNoteCardsForUrl(
    url: string,
    options: CardQueryOptions,
  ): Promise<PaginatedQueryResult<NoteCardForUrlRawDTO>> {
    return this.noteCardQueryService.getNoteCardsForUrl(url, options);
  }

  async getBatchUrlCardViews(
    cardIds: string[],
    callingUserId?: string,
  ): Promise<Map<string, UrlCardView>> {
    return this.urlCardQueryService.getBatchUrlCardViews(
      cardIds,
      callingUserId,
    );
  }

  async getBatchUrlLibraryInfo(
    urls: string[],
    callingUserId?: string,
  ): Promise<Map<string, UrlLibraryInfo>> {
    return this.urlCardQueryService.getBatchUrlLibraryInfo(urls, callingUserId);
  }

  async searchUrls(
    options: SearchUrlsOptions,
  ): Promise<PaginatedQueryResult<UrlSearchResultDTO>> {
    return this.urlCardQueryService.searchUrls(options);
  }
}
