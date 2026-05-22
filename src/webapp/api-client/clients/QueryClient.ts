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
} from '@semble/types';

export class QueryClient extends BaseClient {
  async getUrlMetadata(
    params: GetUrlMetadataParams,
  ): Promise<GetUrlMetadataResponse> {
    const res = await this.client.cards.urlMetadata({
      query: { url: params.url, includeStats: params.includeStats },
    });
    return res.body as GetUrlMetadataResponse;
  }

  async getMyUrlCards(
    params?: GetMyUrlCardsParams,
  ): Promise<GetUrlCardsResponse> {
    const res = await this.client.cards.myUrlCards({
      query: {
        page: params?.page,
        limit: params?.limit,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder,
        urlType: params?.urlType,
        uncollected: params?.uncollected ? true : undefined,
      },
    });
    return res.body as GetUrlCardsResponse;
  }

  async getUserUrlCards(
    params: GetUrlCardsParams,
  ): Promise<GetUrlCardsResponse> {
    const res = await this.client.cards.cardsByUser({
      query: {
        identifier: params.identifier,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        urlType: params.urlType,
        uncollected: params.uncollected ? true : undefined,
      },
    });
    return res.body as GetUrlCardsResponse;
  }

  async getUrlCardView(cardId: string): Promise<GetUrlCardViewResponse> {
    const res = await this.client.cards.cardById({ query: { cardId } });
    return res.body as GetUrlCardViewResponse;
  }

  async getLibrariesForCard(
    cardId: string,
  ): Promise<GetLibrariesForCardResponse> {
    const res = await this.client.cards.cardLibraries({ query: { cardId } });
    return res.body as GetLibrariesForCardResponse;
  }

  async getMyProfile(params?: {
    includeStats?: boolean;
  }): Promise<GetProfileResponse> {
    const res = await this.client.users.myProfile({
      query: { includeStats: params?.includeStats },
    });
    return res.body as GetProfileResponse;
  }

  async getUserProfile(params: GetProfileParams): Promise<GetProfileResponse> {
    const res = await this.client.users.userProfile({
      query: {
        identifier: params.identifier,
        includeStats: params.includeStats,
      },
    });
    return res.body as GetProfileResponse;
  }

  async getCollectionPage(
    collectionId: string,
    params?: GetCollectionPageParams,
  ): Promise<GetCollectionPageResponse> {
    const res = await this.client.collections.collectionById({
      query: {
        collectionId,
        page: params?.page,
        limit: params?.limit,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder,
        urlType: params?.urlType,
      },
    });
    return res.body as GetCollectionPageResponse;
  }

  async getCollectionPageByAtUri(
    params: GetCollectionPageByAtUriParams,
  ): Promise<GetCollectionPageResponse> {
    const { handle, recordKey, page, limit, sortBy, sortOrder, urlType } =
      params;
    const res = await this.client.collections.collectionByAtUri({
      query: { handle, recordKey, page, limit, sortBy, sortOrder, urlType },
    });
    return res.body as GetCollectionPageResponse;
  }

  async getMyCollections(
    params?: GetMyCollectionsParams,
  ): Promise<GetCollectionsResponse> {
    const res = await this.client.collections.myCollections({
      query: {
        page: params?.page,
        limit: params?.limit,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder,
        searchText: params?.searchText,
      },
    });
    return res.body as GetCollectionsResponse;
  }

  async getUserCollections(
    params: GetCollectionsParams,
  ): Promise<GetCollectionsResponse> {
    const res = await this.client.collections.collectionsByUser({
      query: {
        identifier: params.identifier,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        searchText: params.searchText,
      },
    });
    return res.body as GetCollectionsResponse;
  }

  async getUrlStatusForMyLibrary(
    params: GetUrlStatusForMyLibraryParams,
  ): Promise<GetUrlStatusForMyLibraryResponse> {
    const res = await this.client.cards.urlLibraryStatus({
      query: { url: params.url },
    });
    return res.body as GetUrlStatusForMyLibraryResponse;
  }

  async getLibrariesForUrl(
    params: GetLibrariesForUrlParams,
  ): Promise<GetLibrariesForUrlResponse> {
    const res = await this.client.cards.librariesForUrl({
      query: {
        url: params.url,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      },
    });
    return res.body as GetLibrariesForUrlResponse;
  }

  async getNoteCardsForUrl(
    params: GetNoteCardsForUrlParams,
  ): Promise<GetNoteCardsForUrlResponse> {
    const res = await this.client.cards.noteCardsForUrl({
      query: {
        url: params.url,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      },
    });
    return res.body as GetNoteCardsForUrlResponse;
  }

  async getCollectionsForUrl(
    params: GetCollectionsForUrlParams,
  ): Promise<GetCollectionsForUrlResponse> {
    const res = await this.client.collections.collectionsForUrl({
      query: {
        url: params.url,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      },
    });
    return res.body as GetCollectionsForUrlResponse;
  }

  async getSimilarUrlsForUrl(
    params: GetSimilarUrlsForUrlParams,
  ): Promise<GetSimilarUrlsForUrlResponse> {
    const res = await this.client.search.similarUrls({
      query: {
        url: params.url,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        threshold: params.threshold,
        urlType: params.urlType as any,
      },
    });
    return res.body as GetSimilarUrlsForUrlResponse;
  }

  async semanticSearchUrls(
    params: SemanticSearchUrlsParams,
  ): Promise<SemanticSearchUrlsResponse> {
    const res = await this.client.search.semantic({
      query: {
        query: params.query,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        threshold: params.threshold,
        urlType: params.urlType as any,
        identifier: params.identifier,
      },
    });
    return res.body as SemanticSearchUrlsResponse;
  }

  async searchBskyPosts(
    params: SearchBskyPostsForUrlParams,
  ): Promise<SearchBskyPostsForUrlResponse> {
    const res = await this.client.search.bskyPosts({
      query: {
        q: params.q,
        sort: params.sort,
        since: params.since,
        until: params.until,
        mentions: params.mentions,
        author: params.author,
        lang: params.lang,
        domain: params.domain,
        url: params.url,
        tag: params.tag,
        limit: params.limit,
        cursor: params.cursor,
      },
    });
    return res.body as SearchBskyPostsForUrlResponse;
  }

  async searchAtProtoAccounts(
    params: SearchAtProtoAccountsParams,
  ): Promise<SearchAtProtoAccountsResponse> {
    const res = await this.client.search.atProtoAccounts({
      query: {
        term: params.term,
        q: params.q,
        limit: params.limit,
        cursor: params.cursor,
      },
    });
    return res.body as SearchAtProtoAccountsResponse;
  }

  async searchLeafletDocs(
    params: SearchLeafletDocsForUrlParams,
  ): Promise<SearchLeafletDocsForUrlResponse> {
    const res = await this.client.search.leafletDocs({
      query: { url: params.url, limit: params.limit, cursor: params.cursor },
    });
    return res.body as SearchLeafletDocsForUrlResponse;
  }

  async getOpenCollectionsWithContributor(
    params: GetOpenCollectionsWithContributorParams,
  ): Promise<GetCollectionsResponse> {
    const res = await this.client.collections.openWithContributor({
      query: {
        identifier: params.identifier,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      },
    });
    return res.body as GetCollectionsResponse;
  }

  async getFollowingUsers(
    params: GetFollowingUsersParams,
  ): Promise<GetFollowingUsersResponse> {
    const res = await this.client.users.followingUsers({
      query: {
        identifier: params.identifier,
        page: params.page,
        limit: params.limit,
      },
    });
    return res.body as GetFollowingUsersResponse;
  }

  async getFollowers(
    params: GetFollowersParams,
  ): Promise<GetFollowersResponse> {
    const res = await this.client.users.userFollowers({
      query: {
        identifier: params.identifier,
        page: params.page,
        limit: params.limit,
      },
    });
    return res.body as GetFollowersResponse;
  }

  async getFollowingCollections(
    params: GetFollowingCollectionsParams,
  ): Promise<GetFollowingCollectionsResponse> {
    const res = await this.client.users.followingCollections({
      query: {
        identifier: params.identifier,
        page: params.page,
        limit: params.limit,
      },
    });
    return res.body as GetFollowingCollectionsResponse;
  }

  async getCollectionFollowers(
    params: GetCollectionFollowersParams,
  ): Promise<GetCollectionFollowersResponse> {
    const res = await this.client.collections.collectionFollowers({
      query: {
        collectionId: params.collectionId,
        page: params.page,
        limit: params.limit,
      },
    });
    return res.body as GetCollectionFollowersResponse;
  }

  async getFollowersCount(
    params: GetFollowersCountParams,
  ): Promise<GetFollowCountResponse> {
    const res = await this.client.users.userFollowersCount({
      query: { identifier: params.identifier },
    });
    return res.body as GetFollowCountResponse;
  }

  async getFollowingCollectionsCount(
    params: GetFollowingCollectionsCountParams,
  ): Promise<GetFollowCountResponse> {
    const res = await this.client.users.followingCollectionsCount({
      query: { identifier: params.identifier },
    });
    return res.body as GetFollowCountResponse;
  }

  async getCollectionFollowersCount(
    params: GetCollectionFollowersCountParams,
  ): Promise<GetFollowCountResponse> {
    const res = await this.client.collections.collectionFollowersCount({
      query: { collectionId: params.collectionId },
    });
    return res.body as GetFollowCountResponse;
  }

  async getCollectionContributors(
    params: GetCollectionContributorsParams,
  ): Promise<GetCollectionContributorsResponse> {
    const res = await this.client.collections.collectionContributors({
      query: {
        collectionId: params.collectionId,
        page: params.page,
        limit: params.limit,
      },
    });
    return res.body as GetCollectionContributorsResponse;
  }

  async getConnectionsForUrl(
    params: GetConnectionsForUrlParams,
  ): Promise<GetConnectionsForUrlResponse> {
    const res = await this.client.connections.connectionsForUrl({
      query: {
        url: params.url,
        direction: params.direction,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        connectionTypes: params.connectionTypes,
      },
    });
    return res.body as GetConnectionsForUrlResponse;
  }

  async getConnections(
    params: GetConnectionsParams,
  ): Promise<GetConnectionsResponse> {
    const res = await this.client.connections.connectionsByUser({
      query: {
        identifier: params.identifier,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        connectionTypes: params.connectionTypes,
      },
    });
    return res.body as GetConnectionsResponse;
  }

  async searchUrls(params: SearchUrlsParams): Promise<SearchUrlsResponse> {
    const res = await this.client.cards.searchCards({
      query: {
        searchQuery: params.searchQuery,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        urlType: params.urlType,
      },
    });
    return res.body as SearchUrlsResponse;
  }

  async getUserGraphData(params: {
    identifier: string;
    page?: number;
    limit?: number;
  }): Promise<GetGraphDataResponse> {
    const res = await this.client.graph.userGraphData({
      query: {
        identifier: params.identifier,
        page: params.page,
        limit: params.limit,
      },
    });
    return res.body as GetGraphDataResponse;
  }

  async getUrlGraphData(
    params: GetUrlGraphDataParams,
  ): Promise<GetGraphDataResponse> {
    const res = await this.client.graph.urlGraphData({
      query: { url: params.url, depth: params.depth },
    });
    return res.body as GetGraphDataResponse;
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

    const res = await this.client.graph.graphData({
      query: { page: params?.page, limit: params?.limit },
    });
    return res.body as GetGraphDataResponse;
  }
}
