type ExtractParams<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<Rest>
    : Path extends `${string}:${infer Param}`
      ? Param
      : never;

type BuildArgs<Path extends string> =
  ExtractParams<Path> extends never
    ? []
    : [params: Record<ExtractParams<Path>, string>];

export interface RouteDefinition<Path extends string> {
  readonly path: Path;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly requiresAuth: boolean;
  build(...args: BuildArgs<Path>): string;
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
    build(...args: any[]) {
      const params: Record<string, string> = args[0] ?? {};
      return path.replace(/:([^/]+)/g, (_, key) => params[key] ?? key);
    },
  } as RouteDefinition<Path>;
}

export const paths = {
  // cards
  addUrlToLibrary: '/api/cards/library/urls',
  addCardToLibrary: '/api/cards/library',
  addCardToCollection: '/api/cards/collections',
  urlCardAssociations: '/api/cards/url/associations',
  myUrlCards: '/api/cards/my',
  urlMetadata: '/api/cards/metadata',
  urlLibraryStatus: '/api/cards/library/status',
  librariesForUrl: '/api/cards/libraries/url',
  noteCardsForUrl: '/api/cards/notes/url',
  searchCards: '/api/cards/search',
  cardById: '/api/cards/:cardId',
  cardLibraries: '/api/cards/:cardId/libraries',
  cardNote: '/api/cards/:cardId/note',
  removeFromLibrary: '/api/cards/:cardId/library',
  removeFromCollections: '/api/cards/:cardId/collections',
  cardsByUser: '/api/cards/user/:identifier',
  // collections
  myCollections: '/api/collections',
  createCollection: '/api/collections',
  collectionsForUrl: '/api/collections/url',
  searchCollections: '/api/collections/search',
  collectionById: '/api/collections/:collectionId',
  updateCollection: '/api/collections/:collectionId',
  deleteCollection: '/api/collections/:collectionId',
  collectionsByUser: '/api/collections/user/:identifier',
  collectionByAtUri: '/api/collections/at/:handle/:recordKey',
  openWithContributor: '/api/collections/contributed/:identifier',
  collectionFollowers: '/api/collections/:collectionId/followers',
  collectionFollowersCount: '/api/collections/:collectionId/followers/count',
  collectionContributors: '/api/collections/:collectionId/contributors',
  // users
  myProfile: '/api/users/me',
  userProfile: '/api/users/:identifier',
  initiateOAuth: '/api/users/login',
  oauthCallback: '/api/users/oauth/callback',
  loginWithAppPassword: '/api/users/login/app-password',
  refreshToken: '/api/users/oauth/refresh',
  logout: '/api/users/logout',
  extensionTokens: '/api/users/extension/tokens',
  followTarget: '/api/users/follows',
  unfollowTarget: '/api/users/follows/:targetId/:targetType',
  followingUsers: '/api/users/:identifier/following',
  userFollowers: '/api/users/:identifier/followers',
  followingCollections: '/api/users/:identifier/following-collections',
  followingCount: '/api/users/:identifier/following/count',
  userFollowersCount: '/api/users/:identifier/followers/count',
  followingCollectionsCount:
    '/api/users/:identifier/following-collections/count',
  // feeds
  globalFeed: '/api/feeds/global',
  gemFeed: '/api/feeds/gem',
  followingFeed: '/api/feeds/following',
  // notifications
  myNotifications: '/api/notifications',
  unreadCount: '/api/notifications/unread-count',
  markRead: '/api/notifications/mark-read',
  markAllRead: '/api/notifications/mark-all-read',
  // connections
  connectionsForUrl: '/api/connections/url',
  createConnection: '/api/connections',
  connectionsByUser: '/api/connections/user/:identifier',
  updateConnection: '/api/connections/:connectionId',
  deleteConnection: '/api/connections/:connectionId',
  // search
  similarUrls: '/api/search/similar-urls',
  semantic: '/api/search/semantic',
  bskyPosts: '/api/search/bsky-posts',
  atProtoAccounts: '/api/search/accounts',
  leafletDocs: '/api/search/leaflet-docs',
  // graph
  graphData: '/api/graph/data',
  userGraphData: '/api/graph/user/:identifier',
  urlGraphData: '/api/graph/url',
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
