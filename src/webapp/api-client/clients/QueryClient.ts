import { BaseClient } from './BaseClient';
import {
  GetUrlMetadataResponse,
  GetUrlCardsResponse,
  GetUrlCardViewResponse,
  GetLibrariesForCardResponse,
  GetProfileResponse,
  GetCollectionPageResponse,
  GetCollectionsResponse,
  GetUrlStatusForMyLibraryResponse,
  GetMyUrlCardsParams,
  GetUrlCardsParams,
  GetCollectionPageParams,
  GetMyCollectionsParams,
  GetCollectionsParams,
  GetCollectionPageByAtUriParams,
  GetProfileParams,
  GetUrlStatusForMyLibraryParams,
  GetLibrariesForUrlParams,
  GetLibrariesForUrlResponse,
  GetNoteCardsForUrlParams,
  GetNoteCardsForUrlResponse,
  GetCollectionsForUrlParams,
  GetCollectionsForUrlResponse,
  GetSimilarUrlsForUrlParams,
  GetSimilarUrlsForUrlResponse,
  SemanticSearchUrlsParams,
  SemanticSearchUrlsResponse,
  SearchBskyPostsForUrlParams,
  SearchBskyPostsForUrlResponse,
  SearchAtProtoAccountsParams,
  SearchAtProtoAccountsResponse,
} from '@semble/types';

export class QueryClient extends BaseClient {
  async getUrlMetadata(url: string): Promise<GetUrlMetadataResponse> {
    const params = new URLSearchParams({ url });
    return this.request<GetUrlMetadataResponse>(
      'GET',
      `/api/cards/metadata?${params}`,
    );
  }

  async getMyUrlCards(
    params?: GetMyUrlCardsParams,
  ): Promise<GetUrlCardsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.urlType) searchParams.set('urlType', params.urlType);

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/cards/my?${queryString}`
      : '/api/cards/my';

    return this.request<GetUrlCardsResponse>('GET', endpoint);
  }

  async getUserUrlCards(
    params: GetUrlCardsParams,
  ): Promise<GetUrlCardsResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params.urlType) searchParams.set('urlType', params.urlType);

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/cards/user/${params.identifier}?${queryString}`
      : `/api/cards/user/${params.identifier}`;

    return this.request<GetUrlCardsResponse>('GET', endpoint);
  }

  async getUrlCardView(cardId: string): Promise<GetUrlCardViewResponse> {
    return this.request<GetUrlCardViewResponse>('GET', `/api/cards/${cardId}`);
  }

  async getLibrariesForCard(
    cardId: string,
  ): Promise<GetLibrariesForCardResponse> {
    return this.request<GetLibrariesForCardResponse>(
      'GET',
      `/api/cards/${cardId}/libraries`,
    );
  }

  async getMyProfile(): Promise<GetProfileResponse> {
    return this.request<GetProfileResponse>('GET', '/api/users/me');
  }

  async getUserProfile(params: GetProfileParams): Promise<GetProfileResponse> {
    return this.request<GetProfileResponse>(
      'GET',
      `/api/users/${params.identifier}`,
    );
  }

  async getCollectionPage(
    collectionId: string,
    params?: GetCollectionPageParams,
  ): Promise<GetCollectionPageResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.urlType) searchParams.set('urlType', params.urlType);

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/collections/${collectionId}?${queryString}`
      : `/api/collections/${collectionId}`;

    return this.request<GetCollectionPageResponse>('GET', endpoint);
  }

  async getCollectionPageByAtUri(
    params: GetCollectionPageByAtUriParams,
  ): Promise<GetCollectionPageResponse> {
    const { handle, recordKey, ...queryParams } = params;
    const searchParams = new URLSearchParams();

    if (queryParams.page) searchParams.set('page', queryParams.page.toString());
    if (queryParams.limit)
      searchParams.set('limit', queryParams.limit.toString());
    if (queryParams.sortBy) searchParams.set('sortBy', queryParams.sortBy);
    if (queryParams.sortOrder)
      searchParams.set('sortOrder', queryParams.sortOrder);
    if (queryParams.urlType) searchParams.set('urlType', queryParams.urlType);

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/collections/at/${handle}/${recordKey}?${queryString}`
      : `/api/collections/at/${handle}/${recordKey}`;

    return this.request<GetCollectionPageResponse>('GET', endpoint);
  }

  async getMyCollections(
    params?: GetMyCollectionsParams,
  ): Promise<GetCollectionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.searchText) searchParams.set('searchText', params.searchText);

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/collections?${queryString}`
      : '/api/collections';

    return this.request<GetCollectionsResponse>('GET', endpoint);
  }

  async getUserCollections(
    params: GetCollectionsParams,
  ): Promise<GetCollectionsResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params.searchText) searchParams.set('searchText', params.searchText);

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/collections/user/${params.identifier}?${queryString}`
      : `/api/collections/user/${params.identifier}`;

    return this.request<GetCollectionsResponse>('GET', endpoint);
  }

  async getUrlStatusForMyLibrary(
    params: GetUrlStatusForMyLibraryParams,
  ): Promise<GetUrlStatusForMyLibraryResponse> {
    const searchParams = new URLSearchParams({ url: params.url });
    return this.request<GetUrlStatusForMyLibraryResponse>(
      'GET',
      `/api/cards/library/status?${searchParams}`,
    );
  }

  async getLibrariesForUrl(
    params: GetLibrariesForUrlParams,
  ): Promise<GetLibrariesForUrlResponse> {
    const searchParams = new URLSearchParams({ url: params.url });
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    return this.request<GetLibrariesForUrlResponse>(
      'GET',
      `/api/cards/libraries/url?${searchParams}`,
    );
  }

  async getNoteCardsForUrl(
    params: GetNoteCardsForUrlParams,
  ): Promise<GetNoteCardsForUrlResponse> {
    const searchParams = new URLSearchParams({ url: params.url });
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    return this.request<GetNoteCardsForUrlResponse>(
      'GET',
      `/api/cards/notes/url?${searchParams}`,
    );
  }

  async getCollectionsForUrl(
    params: GetCollectionsForUrlParams,
  ): Promise<GetCollectionsForUrlResponse> {
    const searchParams = new URLSearchParams({ url: params.url });
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    return this.request<GetCollectionsForUrlResponse>(
      'GET',
      `/api/collections/url?${searchParams}`,
    );
  }

  async getSimilarUrlsForUrl(
    params: GetSimilarUrlsForUrlParams,
  ): Promise<GetSimilarUrlsForUrlResponse> {
    const searchParams = new URLSearchParams({ url: params.url });
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params.threshold)
      searchParams.set('threshold', params.threshold.toString());
    if (params.urlType) searchParams.set('urlType', params.urlType);

    return this.request<GetSimilarUrlsForUrlResponse>(
      'GET',
      `/api/search/similar-urls?${searchParams}`,
    );
  }

  async semanticSearchUrls(
    params: SemanticSearchUrlsParams,
  ): Promise<SemanticSearchUrlsResponse> {
    const searchParams = new URLSearchParams({ query: params.query });
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params.threshold)
      searchParams.set('threshold', params.threshold.toString());
    if (params.urlType) searchParams.set('urlType', params.urlType);
    if (params.userId) searchParams.set('userId', params.userId);

    return this.request<SemanticSearchUrlsResponse>(
      'GET',
      `/api/search/semantic?${searchParams}`,
    );
  }

  async searchBskyPosts(
    params: SearchBskyPostsForUrlParams,
  ): Promise<SearchBskyPostsForUrlResponse> {
    const searchParams = new URLSearchParams({ q: params.q });
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.since) searchParams.set('since', params.since);
    if (params.until) searchParams.set('until', params.until);
    if (params.mentions) searchParams.set('mentions', params.mentions);
    if (params.author) searchParams.set('author', params.author);
    if (params.lang) searchParams.set('lang', params.lang);
    if (params.domain) searchParams.set('domain', params.domain);
    if (params.url) searchParams.set('url', params.url);
    if (params.tag) {
      params.tag.forEach((t) => searchParams.append('tag', t));
    }
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.cursor) searchParams.set('cursor', params.cursor);

    return this.request<SearchBskyPostsForUrlResponse>(
      'GET',
      `/api/search/bsky-posts?${searchParams}`,
    );
  }

  async searchAtProtoAccounts(
    params: SearchAtProtoAccountsParams,
  ): Promise<SearchAtProtoAccountsResponse> {
    const searchParams = new URLSearchParams();
    if (params.term) searchParams.set('term', params.term);
    if (params.q) searchParams.set('q', params.q);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.cursor) searchParams.set('cursor', params.cursor);

    return this.request<SearchAtProtoAccountsResponse>(
      'GET',
      `/api/search/accounts?${searchParams}`,
    );
  }
}
