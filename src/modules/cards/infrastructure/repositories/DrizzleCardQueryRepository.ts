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
  UrlStats,
  UserActivityStats,
  SearchUrlsOptions,
  UrlSearchResultDTO,
  AnnotationCardView,
  NoteForAnnotationRawDTO,
  LibraryForAnnotationDTO,
} from '../../domain/ICardQueryRepository';
import { UrlCardQueryService } from './query-services/UrlCardQueryService';
import { CollectionCardQueryService } from './query-services/CollectionCardQueryService';
import { LibraryQueryService } from './query-services/LibraryQueryService';
import { NoteCardQueryService } from './query-services/NoteCardQueryService';
import { AnnotationCardQueryService } from './query-services/AnnotationCardQueryService';

export class DrizzleCardQueryRepository implements ICardQueryRepository {
  private urlCardQueryService: UrlCardQueryService;
  private collectionCardQueryService: CollectionCardQueryService;
  private libraryQueryService: LibraryQueryService;
  private noteCardQueryService: NoteCardQueryService;
  private annotationCardQueryService: AnnotationCardQueryService;

  constructor(private db: PostgresJsDatabase) {
    this.urlCardQueryService = new UrlCardQueryService(db);
    this.collectionCardQueryService = new CollectionCardQueryService(db);
    this.libraryQueryService = new LibraryQueryService(db);
    this.noteCardQueryService = new NoteCardQueryService(db);
    this.annotationCardQueryService = new AnnotationCardQueryService(db);
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

  async getAnnotationsForUrl(
    url: string,
    options: CardQueryOptions,
  ): Promise<PaginatedQueryResult<AnnotationCardView>> {
    return this.annotationCardQueryService.getAnnotationsForUrl(url, options);
  }

  async getAnnotationCardById(
    cardId: string,
  ): Promise<AnnotationCardView | null> {
    return this.annotationCardQueryService.getAnnotationCardById(cardId);
  }

  async getMatchingAnnotationCardIds(
    url: string,
    exactNormalized: string,
  ): Promise<string[]> {
    return this.annotationCardQueryService.getMatchingAnnotationCardIds(
      url,
      exactNormalized,
    );
  }

  async getNotesForAnnotation(
    url: string,
    exactNormalized: string,
    options: CardQueryOptions,
  ): Promise<PaginatedQueryResult<NoteForAnnotationRawDTO>> {
    return this.annotationCardQueryService.getNotesForAnnotation(
      url,
      exactNormalized,
      options,
    );
  }

  async getLibrariesForAnnotation(
    url: string,
    exactNormalized: string,
    options: CardQueryOptions,
  ): Promise<PaginatedQueryResult<LibraryForAnnotationDTO>> {
    return this.annotationCardQueryService.getLibrariesForAnnotation(
      url,
      exactNormalized,
      options,
    );
  }

  async getCardUrlsByIds(cardIds: string[]): Promise<Map<string, string>> {
    return this.annotationCardQueryService.getCardUrlsByIds(cardIds);
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

  async getBatchUrlStats(
    urls: string[],
    callingUserId?: string,
  ): Promise<Map<string, UrlStats>> {
    return this.urlCardQueryService.getBatchUrlStats(urls, callingUserId);
  }

  async getUsersForUrls(urls: string[]): Promise<string[]> {
    return this.urlCardQueryService.getUsersForUrls(urls);
  }

  async getUrlsSavedByUser(
    userId: string,
    urls: string[],
  ): Promise<Set<string>> {
    return this.urlCardQueryService.getUrlsSavedByUser(userId, urls);
  }

  async getBatchUserActivityStats(
    userIds: string[],
  ): Promise<Map<string, UserActivityStats>> {
    return this.urlCardQueryService.getBatchUserActivityStats(userIds);
  }

  async getBatchLatestCardCreatedAt(
    userIds: string[],
  ): Promise<Map<string, Date>> {
    return this.urlCardQueryService.getBatchLatestCardCreatedAt(userIds);
  }

  async searchUrls(
    options: SearchUrlsOptions,
  ): Promise<PaginatedQueryResult<UrlSearchResultDTO>> {
    return this.urlCardQueryService.searchUrls(options);
  }

  async getProfileCardStats(authorId: string): Promise<{
    urlCardCount: number;
  }> {
    return this.urlCardQueryService.getProfileCardStats(authorId);
  }
}
