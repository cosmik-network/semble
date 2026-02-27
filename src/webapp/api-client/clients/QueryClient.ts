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
  SearchLeafletDocsForUrlParams,
  SearchLeafletDocsForUrlResponse,
  GetOpenCollectionsWithContributorParams,
  GetFollowingUsersParams,
  GetFollowingUsersResponse,
  GetFollowersParams,
  GetFollowersResponse,
  GetFollowingCollectionsParams,
  GetFollowingCollectionsResponse,
  GetCollectionFollowersParams,
  GetCollectionFollowersResponse,
  GetFollowingCountParams,
  GetFollowersCountParams,
  GetFollowingCollectionsCountParams,
  GetCollectionFollowersCountParams,
  GetFollowCountResponse,
  GetCollectionContributorsParams,
  GetCollectionContributorsResponse,
  GetConnectionsParams,
  GetConnectionsResponse,
  GetForwardConnectionsForUrlParams,
  GetForwardConnectionsForUrlResponse,
  GetBackwardConnectionsForUrlParams,
  GetBackwardConnectionsForUrlResponse,
  SearchUrlsParams,
  SearchUrlsResponse,
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
    if (params.identifier) searchParams.set('identifier', params.identifier);

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

  async searchLeafletDocs(
    params: SearchLeafletDocsForUrlParams,
  ): Promise<SearchLeafletDocsForUrlResponse> {
    const searchParams = new URLSearchParams({ url: params.url });
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.cursor) searchParams.set('cursor', params.cursor);

    return this.request<SearchLeafletDocsForUrlResponse>(
      'GET',
      `/api/search/leaflet-docs?${searchParams}`,
    );
  }

  async getOpenCollectionsWithContributor(
    params: GetOpenCollectionsWithContributorParams,
  ): Promise<GetCollectionsResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/collections/contributed/${params.identifier}?${queryString}`
      : `/api/collections/contributed/${params.identifier}`;

    return this.request<GetCollectionsResponse>('GET', endpoint);
  }

  // Follow query methods
  async getFollowingUsers(
    params: GetFollowingUsersParams,
  ): Promise<GetFollowingUsersResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/users/${params.identifier}/following?${queryString}`
      : `/api/users/${params.identifier}/following`;

    return this.request<GetFollowingUsersResponse>('GET', endpoint);
  }

  async getFollowers(
    params: GetFollowersParams,
  ): Promise<GetFollowersResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/users/${params.identifier}/followers?${queryString}`
      : `/api/users/${params.identifier}/followers`;

    return this.request<GetFollowersResponse>('GET', endpoint);
  }

  async getFollowingCollections(
    params: GetFollowingCollectionsParams,
  ): Promise<GetFollowingCollectionsResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/users/${params.identifier}/following-collections?${queryString}`
      : `/api/users/${params.identifier}/following-collections`;

    return this.request<GetFollowingCollectionsResponse>('GET', endpoint);
  }

  async getCollectionFollowers(
    params: GetCollectionFollowersParams,
  ): Promise<GetCollectionFollowersResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/collections/${params.collectionId}/followers?${queryString}`
      : `/api/collections/${params.collectionId}/followers`;

    return this.request<GetCollectionFollowersResponse>('GET', endpoint);
  }

  async getFollowingCount(
    params: GetFollowingCountParams,
  ): Promise<GetFollowCountResponse> {
    return this.request<GetFollowCountResponse>(
      'GET',
      `/api/users/${params.identifier}/following/count`,
    );
  }

  async getFollowersCount(
    params: GetFollowersCountParams,
  ): Promise<GetFollowCountResponse> {
    return this.request<GetFollowCountResponse>(
      'GET',
      `/api/users/${params.identifier}/followers/count`,
    );
  }

  async getFollowingCollectionsCount(
    params: GetFollowingCollectionsCountParams,
  ): Promise<GetFollowCountResponse> {
    return this.request<GetFollowCountResponse>(
      'GET',
      `/api/users/${params.identifier}/following-collections/count`,
    );
  }

  async getCollectionFollowersCount(
    params: GetCollectionFollowersCountParams,
  ): Promise<GetFollowCountResponse> {
    return this.request<GetFollowCountResponse>(
      'GET',
      `/api/collections/${params.collectionId}/followers/count`,
    );
  }

  async getCollectionContributors(
    params: GetCollectionContributorsParams,
  ): Promise<GetCollectionContributorsResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/collections/${params.collectionId}/contributors?${queryString}`
      : `/api/collections/${params.collectionId}/contributors`;

    return this.request<GetCollectionContributorsResponse>('GET', endpoint);
  }

  async getForwardConnectionsForUrl(
    params: GetForwardConnectionsForUrlParams,
  ): Promise<GetForwardConnectionsForUrlResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('url', params.url);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params.connectionTypes) {
      searchParams.set('connectionTypes', params.connectionTypes.join(','));
    }

    return this.request<GetForwardConnectionsForUrlResponse>(
      'GET',
      `/api/connections/forward?${searchParams}`,
    );
  }

  async getBackwardConnectionsForUrl(
    params: GetBackwardConnectionsForUrlParams,
  ): Promise<GetBackwardConnectionsForUrlResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('url', params.url);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params.connectionTypes) {
      searchParams.set('connectionTypes', params.connectionTypes.join(','));
    }

    return this.request<GetBackwardConnectionsForUrlResponse>(
      'GET',
      `/api/connections/backward?${searchParams}`,
    );
  }

  async getConnections(
    params: GetConnectionsParams,
  ): Promise<GetConnectionsResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params.connectionTypes) {
      searchParams.set('connectionTypes', params.connectionTypes.join(','));
    }

    const queryString = searchParams.toString();
    const endpoint = queryString
      ? `/api/connections/user/${params.identifier}?${queryString}`
      : `/api/connections/user/${params.identifier}`;

    return this.request<GetConnectionsResponse>('GET', endpoint);
  }

  async searchUrls(params: SearchUrlsParams): Promise<SearchUrlsResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('searchQuery', params.searchQuery);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params.urlType) searchParams.set('urlType', params.urlType);

    return this.request<SearchUrlsResponse>(
      'GET',
      `/api/cards/search?${searchParams}`,
    );
  }
}
