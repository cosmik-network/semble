type QueryParamValue = string | string[] | number | boolean | undefined;

export interface RouteDefinition<Path extends string> {
  readonly path: Path;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly requiresAuth: boolean;
  url(queryParams?: Record<string, QueryParamValue>): string;
}

function defineRoute<Path extends string>(
  path: Path,
  method: RouteDefinition<Path>['method'],
  requiresAuth: boolean,
): RouteDefinition<Path> {
  return {
    path,
    method,
    requiresAuth,
    url(queryParams?: Record<string, QueryParamValue>): string {
      if (!queryParams) return path;
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(queryParams)) {
        if (v === undefined) continue;
        if (Array.isArray(v)) {
          v.forEach((item) => params.append(k, item));
        } else {
          params.append(k, String(v));
        }
      }
      const qs = params.toString();
      return qs ? `${path}?${qs}` : path;
    },
  };
}

export const paths = {
  // cards
  addUrlToLibrary: '/xrpc/network.cosmik.card.addUrl',
  addCardToLibrary: '/xrpc/network.cosmik.card.addToLibrary',
  addCardToCollection: '/xrpc/network.cosmik.card.addToCollection',
  urlCardAssociations: '/xrpc/network.cosmik.card.updateUrlAssociations',
  myUrlCards: '/xrpc/network.cosmik.card.listMine',
  urlMetadata: '/xrpc/network.cosmik.card.getUrlMetadata',
  urlLibraryStatus: '/xrpc/network.cosmik.card.getLibraryStatus',
  librariesForUrl: '/xrpc/network.cosmik.card.getLibrariesForUrl',
  noteCardsForUrl: '/xrpc/network.cosmik.card.getNoteCardsForUrl',
  searchCards: '/xrpc/network.cosmik.card.search',
  cardById: '/xrpc/network.cosmik.card.get',
  cardLibraries: '/xrpc/network.cosmik.card.getLibraries',
  cardNote: '/xrpc/network.cosmik.card.updateNote',
  removeFromLibrary: '/xrpc/network.cosmik.card.removeFromLibrary',
  removeFromCollections: '/xrpc/network.cosmik.card.removeFromCollections',
  cardsByUser: '/xrpc/network.cosmik.card.listByUser',
  // collections
  myCollections: '/xrpc/network.cosmik.collection.listMine',
  createCollection: '/xrpc/network.cosmik.collection.create',
  collectionsForUrl: '/xrpc/network.cosmik.collection.getForUrl',
  searchCollections: '/xrpc/network.cosmik.collection.search',
  collectionById: '/xrpc/network.cosmik.collection.get',
  updateCollection: '/xrpc/network.cosmik.collection.update',
  deleteCollection: '/xrpc/network.cosmik.collection.delete',
  collectionsByUser: '/xrpc/network.cosmik.collection.listByUser',
  collectionByAtUri: '/xrpc/network.cosmik.collection.getByAtUri',
  openWithContributor: '/xrpc/network.cosmik.collection.listContributed',
  collectionFollowers: '/xrpc/network.cosmik.collection.getFollowers',
  collectionFollowersCount: '/xrpc/network.cosmik.collection.getFollowerCount',
  collectionContributors: '/xrpc/network.cosmik.collection.getContributors',
  // users / actor
  myProfile: '/xrpc/network.cosmik.actor.getMyProfile',
  userProfile: '/xrpc/network.cosmik.actor.getProfile',
  initiateOAuth: '/xrpc/network.cosmik.server.initiateOAuth',
  oauthCallback: '/xrpc/network.cosmik.server.oauthCallback',
  loginWithAppPassword: '/xrpc/network.cosmik.server.createSession',
  refreshToken: '/xrpc/network.cosmik.server.refreshSession',
  logout: '/xrpc/network.cosmik.server.deleteSession',
  extensionTokens: '/xrpc/network.cosmik.server.getExtensionTokens',
  followTarget: '/xrpc/network.cosmik.graph.follow',
  unfollowTarget: '/xrpc/network.cosmik.graph.unfollow',
  followingUsers: '/xrpc/network.cosmik.graph.getFollowing',
  userFollowers: '/xrpc/network.cosmik.graph.getFollowers',
  followingCollections: '/xrpc/network.cosmik.graph.getFollowingCollections',
  followingCount: '/xrpc/network.cosmik.graph.getFollowingCount',
  userFollowersCount: '/xrpc/network.cosmik.graph.getFollowersCount',
  followingCollectionsCount:
    '/xrpc/network.cosmik.graph.getFollowingCollectionsCount',
  // feeds
  globalFeed: '/xrpc/network.cosmik.feed.getGlobal',
  gemFeed: '/xrpc/network.cosmik.feed.getGem',
  followingFeed: '/xrpc/network.cosmik.feed.getFollowing',
  // notifications
  myNotifications: '/xrpc/network.cosmik.notification.list',
  unreadCount: '/xrpc/network.cosmik.notification.getUnreadCount',
  markRead: '/xrpc/network.cosmik.notification.markRead',
  markAllRead: '/xrpc/network.cosmik.notification.markAllRead',
  // connections
  connectionsForUrl: '/xrpc/network.cosmik.connection.getForUrl',
  createConnection: '/xrpc/network.cosmik.connection.create',
  connectionsByUser: '/xrpc/network.cosmik.connection.listByUser',
  updateConnection: '/xrpc/network.cosmik.connection.update',
  deleteConnection: '/xrpc/network.cosmik.connection.delete',
  // search
  similarUrls: '/xrpc/network.cosmik.search.getSimilarUrls',
  semantic: '/xrpc/network.cosmik.search.semantic',
  bskyPosts: '/xrpc/network.cosmik.search.getBskyPosts',
  atProtoAccounts: '/xrpc/network.cosmik.search.getAccounts',
  leafletDocs: '/xrpc/network.cosmik.search.getLeafletDocs',
  // graph (graphView namespace to avoid collision with social graph)
  graphData: '/xrpc/network.cosmik.graphView.getData',
  userGraphData: '/xrpc/network.cosmik.graphView.getUserData',
  urlGraphData: '/xrpc/network.cosmik.graphView.getUrlData',
} as const;

export const routes = {
  cards: {
    addUrlToLibrary: defineRoute(paths.addUrlToLibrary, 'POST', true),
    addCardToLibrary: defineRoute(paths.addCardToLibrary, 'POST', true),
    addCardToCollection: defineRoute(paths.addCardToCollection, 'POST', true),
    urlCardAssociations: defineRoute(paths.urlCardAssociations, 'PUT', true),
    myUrlCards: defineRoute(paths.myUrlCards, 'GET', true),
    urlMetadata: defineRoute(paths.urlMetadata, 'GET', false),
    urlLibraryStatus: defineRoute(paths.urlLibraryStatus, 'GET', true),
    librariesForUrl: defineRoute(paths.librariesForUrl, 'GET', false),
    noteCardsForUrl: defineRoute(paths.noteCardsForUrl, 'GET', false),
    searchCards: defineRoute(paths.searchCards, 'GET', false),
    cardById: defineRoute(paths.cardById, 'GET', false),
    cardLibraries: defineRoute(paths.cardLibraries, 'GET', false),
    cardNote: defineRoute(paths.cardNote, 'PUT', true),
    removeFromLibrary: defineRoute(paths.removeFromLibrary, 'DELETE', true),
    removeFromCollections: defineRoute(
      paths.removeFromCollections,
      'DELETE',
      true,
    ),
    cardsByUser: defineRoute(paths.cardsByUser, 'GET', false),
  },
  collections: {
    myCollections: defineRoute(paths.myCollections, 'GET', true),
    createCollection: defineRoute(paths.createCollection, 'POST', true),
    collectionsForUrl: defineRoute(paths.collectionsForUrl, 'GET', false),
    searchCollections: defineRoute(paths.searchCollections, 'GET', false),
    collectionById: defineRoute(paths.collectionById, 'GET', false),
    updateCollection: defineRoute(paths.updateCollection, 'PUT', true),
    deleteCollection: defineRoute(paths.deleteCollection, 'DELETE', true),
    collectionsByUser: defineRoute(paths.collectionsByUser, 'GET', false),
    collectionByAtUri: defineRoute(paths.collectionByAtUri, 'GET', false),
    openWithContributor: defineRoute(paths.openWithContributor, 'GET', false),
    followers: defineRoute(paths.collectionFollowers, 'GET', false),
    followersCount: defineRoute(paths.collectionFollowersCount, 'GET', false),
    contributors: defineRoute(paths.collectionContributors, 'GET', false),
  },
  users: {
    myProfile: defineRoute(paths.myProfile, 'GET', true),
    userProfile: defineRoute(paths.userProfile, 'GET', false),
    initiateOAuth: defineRoute(paths.initiateOAuth, 'GET', false),
    oauthCallback: defineRoute(paths.oauthCallback, 'GET', false),
    loginWithAppPassword: defineRoute(
      paths.loginWithAppPassword,
      'POST',
      false,
    ),
    refreshToken: defineRoute(paths.refreshToken, 'POST', false),
    logout: defineRoute(paths.logout, 'POST', true),
    extensionTokens: defineRoute(paths.extensionTokens, 'GET', true),
    followTarget: defineRoute(paths.followTarget, 'POST', true),
    unfollowTarget: defineRoute(paths.unfollowTarget, 'DELETE', true),
    followingUsers: defineRoute(paths.followingUsers, 'GET', false),
    followers: defineRoute(paths.userFollowers, 'GET', false),
    followingCollections: defineRoute(paths.followingCollections, 'GET', false),
    followingCount: defineRoute(paths.followingCount, 'GET', false),
    followersCount: defineRoute(paths.userFollowersCount, 'GET', false),
    followingCollectionsCount: defineRoute(
      paths.followingCollectionsCount,
      'GET',
      false,
    ),
  },
  feeds: {
    global: defineRoute(paths.globalFeed, 'GET', false),
    gem: defineRoute(paths.gemFeed, 'GET', false),
    following: defineRoute(paths.followingFeed, 'GET', true),
  },
  notifications: {
    myNotifications: defineRoute(paths.myNotifications, 'GET', true),
    unreadCount: defineRoute(paths.unreadCount, 'GET', true),
    markRead: defineRoute(paths.markRead, 'POST', true),
    markAllRead: defineRoute(paths.markAllRead, 'POST', true),
  },
  connections: {
    connectionsForUrl: defineRoute(paths.connectionsForUrl, 'GET', false),
    createConnection: defineRoute(paths.createConnection, 'POST', true),
    connectionsByUser: defineRoute(paths.connectionsByUser, 'GET', false),
    updateConnection: defineRoute(paths.updateConnection, 'PUT', true),
    deleteConnection: defineRoute(paths.deleteConnection, 'DELETE', true),
  },
  search: {
    similarUrls: defineRoute(paths.similarUrls, 'GET', false),
    semantic: defineRoute(paths.semantic, 'GET', false),
    bskyPosts: defineRoute(paths.bskyPosts, 'GET', false),
    atProtoAccounts: defineRoute(paths.atProtoAccounts, 'GET', false),
    leafletDocs: defineRoute(paths.leafletDocs, 'GET', false),
  },
  graph: {
    graphData: defineRoute(paths.graphData, 'GET', true),
    userGraphData: defineRoute(paths.userGraphData, 'GET', false),
    urlGraphData: defineRoute(paths.urlGraphData, 'GET', false),
  },
} as const;
