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
  addUrlToLibrary: '/network.cosmik.card.addUrl',
  addCardToLibrary: '/network.cosmik.card.addToLibrary',
  addCardToCollection: '/network.cosmik.card.addToCollection',
  urlCardAssociations: '/network.cosmik.card.updateUrlAssociations',
  myUrlCards: '/network.cosmik.card.listMine',
  urlMetadata: '/network.cosmik.card.getUrlMetadata',
  urlLibraryStatus: '/network.cosmik.card.getLibraryStatus',
  librariesForUrl: '/network.cosmik.card.getLibrariesForUrl',
  noteCardsForUrl: '/network.cosmik.card.getNoteCardsForUrl',
  searchCards: '/network.cosmik.card.search',
  cardById: '/network.cosmik.card.get',
  cardLibraries: '/network.cosmik.card.getLibraries',
  cardNote: '/network.cosmik.card.updateNote',
  removeFromLibrary: '/network.cosmik.card.removeFromLibrary',
  removeFromCollections: '/network.cosmik.card.removeFromCollections',
  cardsByUser: '/network.cosmik.card.listByUser',
  // collections
  myCollections: '/network.cosmik.collection.listMine',
  createCollection: '/network.cosmik.collection.create',
  collectionsForUrl: '/network.cosmik.collection.getForUrl',
  searchCollections: '/network.cosmik.collection.search',
  collectionById: '/network.cosmik.collection.get',
  updateCollection: '/network.cosmik.collection.update',
  deleteCollection: '/network.cosmik.collection.delete',
  collectionsByUser: '/network.cosmik.collection.listByUser',
  collectionByAtUri: '/network.cosmik.collection.getByAtUri',
  openWithContributor: '/network.cosmik.collection.listContributed',
  collectionFollowers: '/network.cosmik.collection.getFollowers',
  collectionFollowersCount: '/network.cosmik.collection.getFollowerCount',
  collectionContributors: '/network.cosmik.collection.getContributors',
  // users / actor
  myProfile: '/network.cosmik.actor.getMyProfile',
  userProfile: '/network.cosmik.actor.getProfile',
  initiateOAuth: '/network.cosmik.server.initiateOAuth',
  oauthCallback: '/network.cosmik.server.oauthCallback',
  loginWithAppPassword: '/network.cosmik.server.createSession',
  refreshToken: '/network.cosmik.server.refreshSession',
  logout: '/network.cosmik.server.deleteSession',
  extensionTokens: '/network.cosmik.server.getExtensionTokens',
  followTarget: '/network.cosmik.graph.follow',
  unfollowTarget: '/network.cosmik.graph.unfollow',
  followingUsers: '/network.cosmik.graph.getFollowing',
  userFollowers: '/network.cosmik.graph.getFollowers',
  followingCollections: '/network.cosmik.graph.getFollowingCollections',
  followingCount: '/network.cosmik.graph.getFollowingCount',
  userFollowersCount: '/network.cosmik.graph.getFollowersCount',
  followingCollectionsCount:
    '/network.cosmik.graph.getFollowingCollectionsCount',
  // feeds
  globalFeed: '/network.cosmik.feed.getGlobal',
  gemFeed: '/network.cosmik.feed.getGem',
  followingFeed: '/network.cosmik.feed.getFollowing',
  // notifications
  myNotifications: '/network.cosmik.notification.list',
  unreadCount: '/network.cosmik.notification.getUnreadCount',
  markRead: '/network.cosmik.notification.markRead',
  markAllRead: '/network.cosmik.notification.markAllRead',
  // connections
  connectionsForUrl: '/network.cosmik.connection.getForUrl',
  createConnection: '/network.cosmik.connection.create',
  connectionsByUser: '/network.cosmik.connection.listByUser',
  updateConnection: '/network.cosmik.connection.update',
  deleteConnection: '/network.cosmik.connection.delete',
  // search
  similarUrls: '/network.cosmik.search.getSimilarUrls',
  semantic: '/network.cosmik.search.semantic',
  bskyPosts: '/network.cosmik.search.getBskyPosts',
  atProtoAccounts: '/network.cosmik.search.getAccounts',
  leafletDocs: '/network.cosmik.search.getLeafletDocs',
  // graph (graphView namespace to avoid collision with social graph)
  graphData: '/network.cosmik.graphView.getData',
  userGraphData: '/network.cosmik.graphView.getUserData',
  urlGraphData: '/network.cosmik.graphView.getUrlData',
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
