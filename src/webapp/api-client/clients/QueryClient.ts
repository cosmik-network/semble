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
  GetUrlMetadataParams,
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
  SearchUrlsParams,
  SearchUrlsResponse,
  GetGraphDataParams,
  GetGraphDataResponse,
  GetConnectionsForUrlParams,
  GetConnectionsForUrlResponse,
  GetUrlGraphDataParams,
  routes,
} from '@semble/types';

export class QueryClient extends BaseClient {
  async getUrlMetadata(
    params: GetUrlMetadataParams,
  ): Promise<GetUrlMetadataResponse> {
    const queryParams = new URLSearchParams({ url: params.url });
    if (params.includeStats !== undefined) {
      queryParams.set('includeStats', params.includeStats.toString());
    }
    return this.request<GetUrlMetadataResponse>(
      'GET',
      `${routes.cards.urlMetadata.path}?${queryParams}`,
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
    if (params?.uncollected) searchParams.set('uncollected', 'true');

    const queryString = searchParams.toString();
    const base = routes.cards.myUrlCards.path;
    return this.request<GetUrlCardsResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
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
    if (params.uncollected) searchParams.set('uncollected', 'true');

    const queryString = searchParams.toString();
    const base = routes.cards.cardsByUser.build({
      identifier: params.identifier,
    });
    return this.request<GetUrlCardsResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
  }

  async getUrlCardView(cardId: string): Promise<GetUrlCardViewResponse> {
    return this.request<GetUrlCardViewResponse>(
      'GET',
      routes.cards.cardById.build({ cardId }),
    );
  }

  async getLibrariesForCard(
    cardId: string,
  ): Promise<GetLibrariesForCardResponse> {
    return this.request<GetLibrariesForCardResponse>(
      'GET',
      routes.cards.cardLibraries.build({ cardId }),
    );
  }

  async getMyProfile(params?: {
    includeStats?: boolean;
  }): Promise<GetProfileResponse> {
    const queryParams = new URLSearchParams();
    if (params?.includeStats !== undefined) {
      queryParams.set('includeStats', params.includeStats.toString());
    }
    const queryString = queryParams.toString();
    return this.request<GetProfileResponse>(
      'GET',
      queryString
        ? `${routes.users.myProfile.path}?${queryString}`
        : routes.users.myProfile.path,
    );
  }

  async getUserProfile(params: GetProfileParams): Promise<GetProfileResponse> {
    const queryParams = new URLSearchParams();
    if (params.includeStats !== undefined) {
      queryParams.set('includeStats', params.includeStats.toString());
    }
    const queryString = queryParams.toString();
    const base = routes.users.userProfile.build({
      identifier: params.identifier,
    });
    return this.request<GetProfileResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
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
    const base = routes.collections.collectionById.build({ collectionId });
    return this.request<GetCollectionPageResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
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
    const base = routes.collections.collectionByAtUri.build({
      handle,
      recordKey,
    });
    return this.request<GetCollectionPageResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
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
    const base = routes.collections.myCollections.path;
    return this.request<GetCollectionsResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
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
    const base = routes.collections.collectionsByUser.build({
      identifier: params.identifier,
    });
    return this.request<GetCollectionsResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
  }

  async getUrlStatusForMyLibrary(
    params: GetUrlStatusForMyLibraryParams,
  ): Promise<GetUrlStatusForMyLibraryResponse> {
    const searchParams = new URLSearchParams({ url: params.url });
    return this.request<GetUrlStatusForMyLibraryResponse>(
      'GET',
      `${routes.cards.urlLibraryStatus.path}?${searchParams}`,
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
      `${routes.cards.librariesForUrl.path}?${searchParams}`,
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
      `${routes.cards.noteCardsForUrl.path}?${searchParams}`,
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
      `${routes.collections.collectionsForUrl.path}?${searchParams}`,
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
      `${routes.search.similarUrls.path}?${searchParams}`,
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
      `${routes.search.semantic.path}?${searchParams}`,
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
      `${routes.search.bskyPosts.path}?${searchParams}`,
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
      `${routes.search.atProtoAccounts.path}?${searchParams}`,
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
      `${routes.search.leafletDocs.path}?${searchParams}`,
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
    const base = routes.collections.openWithContributor.build({
      identifier: params.identifier,
    });
    return this.request<GetCollectionsResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
  }

  async getFollowingUsers(
    params: GetFollowingUsersParams,
  ): Promise<GetFollowingUsersResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const base = routes.users.followingUsers.build({
      identifier: params.identifier,
    });
    return this.request<GetFollowingUsersResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
  }

  async getFollowers(
    params: GetFollowersParams,
  ): Promise<GetFollowersResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const base = routes.users.followers.build({
      identifier: params.identifier,
    });
    return this.request<GetFollowersResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
  }

  async getFollowingCollections(
    params: GetFollowingCollectionsParams,
  ): Promise<GetFollowingCollectionsResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const base = routes.users.followingCollections.build({
      identifier: params.identifier,
    });
    return this.request<GetFollowingCollectionsResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
  }

  async getCollectionFollowers(
    params: GetCollectionFollowersParams,
  ): Promise<GetCollectionFollowersResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const base = routes.collections.followers.build({
      collectionId: params.collectionId,
    });
    return this.request<GetCollectionFollowersResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
  }

  async getFollowersCount(
    params: GetFollowersCountParams,
  ): Promise<GetFollowCountResponse> {
    return this.request<GetFollowCountResponse>(
      'GET',
      routes.users.followersCount.build({ identifier: params.identifier }),
    );
  }

  async getFollowingCollectionsCount(
    params: GetFollowingCollectionsCountParams,
  ): Promise<GetFollowCountResponse> {
    return this.request<GetFollowCountResponse>(
      'GET',
      routes.users.followingCollectionsCount.build({
        identifier: params.identifier,
      }),
    );
  }

  async getCollectionFollowersCount(
    params: GetCollectionFollowersCountParams,
  ): Promise<GetFollowCountResponse> {
    return this.request<GetFollowCountResponse>(
      'GET',
      routes.collections.followersCount.build({
        collectionId: params.collectionId,
      }),
    );
  }

  async getCollectionContributors(
    params: GetCollectionContributorsParams,
  ): Promise<GetCollectionContributorsResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const base = routes.collections.contributors.build({
      collectionId: params.collectionId,
    });
    return this.request<GetCollectionContributorsResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
  }

  async getConnectionsForUrl(
    params: GetConnectionsForUrlParams,
  ): Promise<GetConnectionsForUrlResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('url', params.url);
    if (params.direction) searchParams.set('direction', params.direction);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params.connectionTypes) {
      searchParams.set('connectionTypes', params.connectionTypes.join(','));
    }

    return this.request<GetConnectionsForUrlResponse>(
      'GET',
      `${routes.connections.connectionsForUrl.path}?${searchParams}`,
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
    const base = routes.connections.connectionsByUser.build({
      identifier: params.identifier,
    });
    return this.request<GetConnectionsResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
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
      `${routes.cards.searchCards.path}?${searchParams}`,
    );
  }

  async getUserGraphData(params: {
    identifier: string;
    page?: number;
    limit?: number;
  }): Promise<GetGraphDataResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const base = routes.graph.userGraphData.build({
      identifier: params.identifier,
    });
    return this.request<GetGraphDataResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
  }

  async getUrlGraphData(
    params: GetUrlGraphDataParams,
  ): Promise<GetGraphDataResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('url', params.url);
    if (params.depth) searchParams.set('depth', params.depth.toString());

    return this.request<GetGraphDataResponse>(
      'GET',
      `${routes.graph.urlGraphData.path}?${searchParams}`,
    );
  }

  async getGraphData(
    params?: GetGraphDataParams,
  ): Promise<GetGraphDataResponse> {
    const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_GRAPH_DATA === 'true';

    if (useMockData) {
      const { generateMockGraphData, MOCK_GRAPH_PRESETS } = await import(
        './mockGraphData'
      );

      const mockData = generateMockGraphData(MOCK_GRAPH_PRESETS.large);

      await new Promise((resolve) => setTimeout(resolve, 500));

      const page = params?.page || 1;
      const limit = params?.limit || 300;
      const offset = (page - 1) * limit;
      const totalCount = mockData.nodes.length;
      const totalPages = Math.ceil(totalCount / limit);
      const hasMore = page < totalPages;

      const paginatedNodes = mockData.nodes.slice(offset, offset + limit);
      const loadedNodeIds = new Set(paginatedNodes.map((n) => n.id));
      const filteredEdges = mockData.edges.filter(
        (e) => loadedNodeIds.has(e.source) && loadedNodeIds.has(e.target),
      );

      return {
        nodes: paginatedNodes,
        edges: filteredEdges,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasMore,
          limit,
        },
      };
    }

    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const base = routes.graph.graphData.path;
    return this.request<GetGraphDataResponse>(
      'GET',
      queryString ? `${base}?${queryString}` : base,
    );
  }
}
