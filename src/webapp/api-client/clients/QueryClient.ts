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
    return this.request<GetUrlMetadataResponse>(routes.cards.urlMetadata, {
      query: { url: params.url, includeStats: params.includeStats },
    });
  }

  async getMyUrlCards(
    params?: GetMyUrlCardsParams,
  ): Promise<GetUrlCardsResponse> {
    return this.request<GetUrlCardsResponse>(routes.cards.myUrlCards, {
      query: {
        page: params?.page,
        limit: params?.limit,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder,
        urlType: params?.urlType,
        uncollected: params?.uncollected ? true : undefined,
      },
    });
  }

  async getUserUrlCards(
    params: GetUrlCardsParams,
  ): Promise<GetUrlCardsResponse> {
    return this.request<GetUrlCardsResponse>(routes.cards.cardsByUser, {
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
  }

  async getUrlCardView(cardId: string): Promise<GetUrlCardViewResponse> {
    return this.request<GetUrlCardViewResponse>(routes.cards.cardById, {
      query: { cardId },
    });
  }

  async getLibrariesForCard(
    cardId: string,
  ): Promise<GetLibrariesForCardResponse> {
    return this.request<GetLibrariesForCardResponse>(
      routes.cards.cardLibraries,
      {
        query: { cardId },
      },
    );
  }

  async getMyProfile(params?: {
    includeStats?: boolean;
  }): Promise<GetProfileResponse> {
    return this.request<GetProfileResponse>(routes.users.myProfile, {
      query: { includeStats: params?.includeStats },
    });
  }

  async getUserProfile(params: GetProfileParams): Promise<GetProfileResponse> {
    return this.request<GetProfileResponse>(routes.users.userProfile, {
      query: {
        identifier: params.identifier,
        includeStats: params.includeStats,
      },
    });
  }

  async getCollectionPage(
    collectionId: string,
    params?: GetCollectionPageParams,
  ): Promise<GetCollectionPageResponse> {
    return this.request<GetCollectionPageResponse>(
      routes.collections.collectionById,
      {
        query: {
          collectionId,
          page: params?.page,
          limit: params?.limit,
          sortBy: params?.sortBy,
          sortOrder: params?.sortOrder,
          urlType: params?.urlType,
        },
      },
    );
  }

  async getCollectionPageByAtUri(
    params: GetCollectionPageByAtUriParams,
  ): Promise<GetCollectionPageResponse> {
    const { handle, recordKey, page, limit, sortBy, sortOrder, urlType } =
      params;
    return this.request<GetCollectionPageResponse>(
      routes.collections.collectionByAtUri,
      {
        query: { handle, recordKey, page, limit, sortBy, sortOrder, urlType },
      },
    );
  }

  async getMyCollections(
    params?: GetMyCollectionsParams,
  ): Promise<GetCollectionsResponse> {
    return this.request<GetCollectionsResponse>(
      routes.collections.myCollections,
      {
        query: {
          page: params?.page,
          limit: params?.limit,
          sortBy: params?.sortBy,
          sortOrder: params?.sortOrder,
          searchText: params?.searchText,
        },
      },
    );
  }

  async getUserCollections(
    params: GetCollectionsParams,
  ): Promise<GetCollectionsResponse> {
    return this.request<GetCollectionsResponse>(
      routes.collections.collectionsByUser,
      {
        query: {
          identifier: params.identifier,
          page: params.page,
          limit: params.limit,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
          searchText: params.searchText,
        },
      },
    );
  }

  async getUrlStatusForMyLibrary(
    params: GetUrlStatusForMyLibraryParams,
  ): Promise<GetUrlStatusForMyLibraryResponse> {
    return this.request<GetUrlStatusForMyLibraryResponse>(
      routes.cards.urlLibraryStatus,
      { query: { url: params.url } },
    );
  }

  async getLibrariesForUrl(
    params: GetLibrariesForUrlParams,
  ): Promise<GetLibrariesForUrlResponse> {
    return this.request<GetLibrariesForUrlResponse>(
      routes.cards.librariesForUrl,
      {
        query: {
          url: params.url,
          page: params.page,
          limit: params.limit,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        },
      },
    );
  }

  async getNoteCardsForUrl(
    params: GetNoteCardsForUrlParams,
  ): Promise<GetNoteCardsForUrlResponse> {
    return this.request<GetNoteCardsForUrlResponse>(
      routes.cards.noteCardsForUrl,
      {
        query: {
          url: params.url,
          page: params.page,
          limit: params.limit,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        },
      },
    );
  }

  async getCollectionsForUrl(
    params: GetCollectionsForUrlParams,
  ): Promise<GetCollectionsForUrlResponse> {
    return this.request<GetCollectionsForUrlResponse>(
      routes.collections.collectionsForUrl,
      {
        query: {
          url: params.url,
          page: params.page,
          limit: params.limit,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        },
      },
    );
  }

  async getSimilarUrlsForUrl(
    params: GetSimilarUrlsForUrlParams,
  ): Promise<GetSimilarUrlsForUrlResponse> {
    return this.request<GetSimilarUrlsForUrlResponse>(
      routes.search.similarUrls,
      {
        query: {
          url: params.url,
          page: params.page,
          limit: params.limit,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
          threshold: params.threshold,
          urlType: params.urlType,
        },
      },
    );
  }

  async semanticSearchUrls(
    params: SemanticSearchUrlsParams,
  ): Promise<SemanticSearchUrlsResponse> {
    return this.request<SemanticSearchUrlsResponse>(routes.search.semantic, {
      query: {
        query: params.query,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        threshold: params.threshold,
        urlType: params.urlType,
        identifier: params.identifier,
      },
    });
  }

  async searchBskyPosts(
    params: SearchBskyPostsForUrlParams,
  ): Promise<SearchBskyPostsForUrlResponse> {
    return this.request<SearchBskyPostsForUrlResponse>(
      routes.search.bskyPosts,
      {
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
          tag: params.tag, // string[] — url() uses append for arrays
          limit: params.limit,
          cursor: params.cursor,
        },
      },
    );
  }

  async searchAtProtoAccounts(
    params: SearchAtProtoAccountsParams,
  ): Promise<SearchAtProtoAccountsResponse> {
    return this.request<SearchAtProtoAccountsResponse>(
      routes.search.atProtoAccounts,
      {
        query: {
          term: params.term,
          q: params.q,
          limit: params.limit,
          cursor: params.cursor,
        },
      },
    );
  }

  async searchLeafletDocs(
    params: SearchLeafletDocsForUrlParams,
  ): Promise<SearchLeafletDocsForUrlResponse> {
    return this.request<SearchLeafletDocsForUrlResponse>(
      routes.search.leafletDocs,
      {
        query: { url: params.url, limit: params.limit, cursor: params.cursor },
      },
    );
  }

  async getOpenCollectionsWithContributor(
    params: GetOpenCollectionsWithContributorParams,
  ): Promise<GetCollectionsResponse> {
    return this.request<GetCollectionsResponse>(
      routes.collections.openWithContributor,
      {
        query: {
          identifier: params.identifier,
          page: params.page,
          limit: params.limit,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        },
      },
    );
  }

  async getFollowingUsers(
    params: GetFollowingUsersParams,
  ): Promise<GetFollowingUsersResponse> {
    return this.request<GetFollowingUsersResponse>(
      routes.users.followingUsers,
      {
        query: {
          identifier: params.identifier,
          page: params.page,
          limit: params.limit,
        },
      },
    );
  }

  async getFollowers(
    params: GetFollowersParams,
  ): Promise<GetFollowersResponse> {
    return this.request<GetFollowersResponse>(routes.users.followers, {
      query: {
        identifier: params.identifier,
        page: params.page,
        limit: params.limit,
      },
    });
  }

  async getFollowingCollections(
    params: GetFollowingCollectionsParams,
  ): Promise<GetFollowingCollectionsResponse> {
    return this.request<GetFollowingCollectionsResponse>(
      routes.users.followingCollections,
      {
        query: {
          identifier: params.identifier,
          page: params.page,
          limit: params.limit,
        },
      },
    );
  }

  async getCollectionFollowers(
    params: GetCollectionFollowersParams,
  ): Promise<GetCollectionFollowersResponse> {
    return this.request<GetCollectionFollowersResponse>(
      routes.collections.followers,
      {
        query: {
          collectionId: params.collectionId,
          page: params.page,
          limit: params.limit,
        },
      },
    );
  }

  async getFollowersCount(
    params: GetFollowersCountParams,
  ): Promise<GetFollowCountResponse> {
    return this.request<GetFollowCountResponse>(routes.users.followersCount, {
      query: { identifier: params.identifier },
    });
  }

  async getFollowingCollectionsCount(
    params: GetFollowingCollectionsCountParams,
  ): Promise<GetFollowCountResponse> {
    return this.request<GetFollowCountResponse>(
      routes.users.followingCollectionsCount,
      { query: { identifier: params.identifier } },
    );
  }

  async getCollectionFollowersCount(
    params: GetCollectionFollowersCountParams,
  ): Promise<GetFollowCountResponse> {
    return this.request<GetFollowCountResponse>(
      routes.collections.followersCount,
      {
        query: { collectionId: params.collectionId },
      },
    );
  }

  async getCollectionContributors(
    params: GetCollectionContributorsParams,
  ): Promise<GetCollectionContributorsResponse> {
    return this.request<GetCollectionContributorsResponse>(
      routes.collections.contributors,
      {
        query: {
          collectionId: params.collectionId,
          page: params.page,
          limit: params.limit,
        },
      },
    );
  }

  async getConnectionsForUrl(
    params: GetConnectionsForUrlParams,
  ): Promise<GetConnectionsForUrlResponse> {
    return this.request<GetConnectionsForUrlResponse>(
      routes.connections.connectionsForUrl,
      {
        query: {
          url: params.url,
          direction: params.direction,
          page: params.page,
          limit: params.limit,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
          connectionTypes: params.connectionTypes?.join(','),
        },
      },
    );
  }

  async getConnections(
    params: GetConnectionsParams,
  ): Promise<GetConnectionsResponse> {
    return this.request<GetConnectionsResponse>(
      routes.connections.connectionsByUser,
      {
        query: {
          identifier: params.identifier,
          page: params.page,
          limit: params.limit,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
          connectionTypes: params.connectionTypes?.join(','),
        },
      },
    );
  }

  async searchUrls(params: SearchUrlsParams): Promise<SearchUrlsResponse> {
    return this.request<SearchUrlsResponse>(routes.cards.searchCards, {
      query: {
        searchQuery: params.searchQuery,
        page: params.page,
        limit: params.limit,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        urlType: params.urlType,
      },
    });
  }

  async getUserGraphData(params: {
    identifier: string;
    page?: number;
    limit?: number;
  }): Promise<GetGraphDataResponse> {
    return this.request<GetGraphDataResponse>(routes.graph.userGraphData, {
      query: {
        identifier: params.identifier,
        page: params.page,
        limit: params.limit,
      },
    });
  }

  async getUrlGraphData(
    params: GetUrlGraphDataParams,
  ): Promise<GetGraphDataResponse> {
    return this.request<GetGraphDataResponse>(routes.graph.urlGraphData, {
      query: { url: params.url, depth: params.depth },
    });
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

    return this.request<GetGraphDataResponse>(routes.graph.graphData, {
      query: { page: params?.page, limit: params?.limit },
    });
  }
}
