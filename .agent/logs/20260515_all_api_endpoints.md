# All API Endpoints

## Quick Reference List

### Queries (GET)

**Cards**

- `GET /api/cards/metadata` (`getUrlMetadata`)
- `GET /api/cards/my` (`getMyUrlCards`)
- `GET /api/cards/user/:identifier` (`getUrlCards`)
- `GET /api/cards/:cardId` (`getUrlCardView`)
- `GET /api/cards/:cardId/libraries` (`getLibrariesForCard`)
- `GET /api/cards/library/status` (`getUrlStatusForMyLibrary`)
- `GET /api/cards/libraries/url` (`getLibrariesForUrl`)
- `GET /api/cards/notes/url` (`getNoteCardsForUrl`)
- `GET /api/cards/search` (`searchUrls`)

**Collections**

- `GET /api/collections` (`getMyCollections`)
- `GET /api/collections/:collectionId` (`getCollectionPage`)
- `GET /api/collections/at/:handle/:recordKey` (`getCollectionPageByAtUri`)
- `GET /api/collections/user/:identifier` (`getCollections`)
- `GET /api/collections/url` (`getCollectionsForUrl`)
- `GET /api/collections/contributed/:identifier` (`getOpenCollectionsWithContributor`)
- `GET /api/collections/search` (`searchCollections`)
- `GET /api/collections/:collectionId/followers` (`getCollectionFollowers`)
- `GET /api/collections/:collectionId/followers/count` (`getCollectionFollowersCount`)
- `GET /api/collections/:collectionId/contributors` (`getCollectionContributors`)

**Users**

- `GET /api/users/me` (`getMyProfile`)
- `GET /api/users/:identifier` (`getProfile`)
- `GET /api/users/login` (`initiateOAuthSignIn`)
- `GET /api/users/oauth/callback` (`completeOAuthSignIn`)
- `GET /api/users/extension/tokens` (`generateExtensionTokens`)
- `GET /api/users/:identifier/following` (`getFollowingUsers`)
- `GET /api/users/:identifier/followers` (`getFollowers`)
- `GET /api/users/:identifier/following-collections` (`getFollowingCollections`)
- `GET /api/users/:identifier/following/count` (`getFollowingCount`)
- `GET /api/users/:identifier/followers/count` (`getFollowersCount`)
- `GET /api/users/:identifier/following-collections/count` (`getFollowingCollectionsCount`)

**Feeds**

- `GET /api/feeds/global` (`getGlobalFeed`)
- `GET /api/feeds/gem` (`getGemsActivityFeed`)
- `GET /api/feeds/following` (`getFollowingFeed`)

**Notifications**

- `GET /api/notifications` (`getMyNotifications`)
- `GET /api/notifications/unread-count` (`getUnreadNotificationCount`)

**Connections**

- `GET /api/connections/url` (`getConnectionsForUrl`)
- `GET /api/connections/user/:identifier` (`getConnections`)

**Search**

- `GET /api/search/similar-urls` (`getSimilarUrlsForUrl`)
- `GET /api/search/semantic` (`semanticSearchUrls`)
- `GET /api/search/bsky-posts` (`searchBskyPosts`)
- `GET /api/search/accounts` (`searchAtProtoAccounts`)
- `GET /api/search/leaflet-docs` (`searchLeafletDocs`)

**Graph**

- `GET /api/graph/data` (`getGraphData`)
- `GET /api/graph/user/:identifier` (`getUserGraphData`)
- `GET /api/graph/url` (`getUrlGraphData`)

### Commands (POST / PUT / DELETE)

**Cards**

- `POST /api/cards/library/urls` (`addUrlToLibrary`)
- `POST /api/cards/library` (`addCardToLibrary`)
- `POST /api/cards/collections` (`addCardToCollection`)
- `PUT /api/cards/:cardId/note` (`updateNoteCard`)
- `PUT /api/cards/url/associations` (`updateUrlCardAssociations`)
- `DELETE /api/cards/:cardId/library` (`removeCardFromLibrary`)
- `DELETE /api/cards/:cardId/collections` (`removeCardFromCollection`)

**Collections**

- `POST /api/collections` (`createCollection`)
- `PUT /api/collections/:collectionId` (`updateCollection`)
- `DELETE /api/collections/:collectionId` (`deleteCollection`)

**Users / Auth**

- `POST /api/users/login/app-password` (`loginWithAppPassword`)
- `POST /api/users/oauth/refresh` (`refreshAccessToken`)
- `POST /api/users/logout` (`logout`)
- `POST /api/users/follows` (`followTarget`)
- `DELETE /api/users/follows/:targetId/:targetType` (`unfollowTarget`)

**Notifications**

- `POST /api/notifications/mark-read` (`markNotificationsAsRead`)
- `POST /api/notifications/mark-all-read` (`markAllNotificationsAsRead`)

**Connections**

- `POST /api/connections` (`createConnection`)
- `PUT /api/connections/:connectionId` (`updateConnection`)
- `DELETE /api/connections/:connectionId` (`deleteConnection`)

---

## Full Typed Reference

### Queries

#### `GET /api/cards/metadata` (`getUrlMetadata`)

```ts
Request: GetUrlMetadataParams
  url: string
  includeStats?: boolean

Response: GetUrlMetadataResponse
  metadata: UrlMetadata
  stats?: UrlAggregateStats
```

#### `GET /api/cards/my` (`getMyUrlCards`)

```ts
Request: GetMyUrlCardsParams (query params)
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  urlType?: UrlType
  uncollected?: boolean

Response: GetUrlCardsResponse
  cards: UrlCard[]
  pagination: Pagination
  sorting: CardSorting
```

#### `GET /api/cards/user/:identifier` (`getUrlCards`)

```ts
Request: GetUrlCardsParams (query params)
  identifier: string  // path param (DID or handle)
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  urlType?: UrlType
  uncollected?: boolean

Response: GetUrlCardsResponse
  cards: UrlCard[]
  pagination: Pagination
  sorting: CardSorting
```

#### `GET /api/cards/:cardId` (`getUrlCardView`)

```ts
Request: cardId: string  // path param

Response: GetUrlCardViewResponse (extends UrlCardWithCollectionsAndLibraries)
  id: string
  type: 'URL'
  url: string
  uri?: string
  cardContent: UrlMetadata
  libraryCount: number
  urlLibraryCount: number
  urlInLibrary?: boolean
  urlConnectionCount?: number
  urlIsConnected?: boolean
  createdAt: string
  updatedAt: string
  author: User
  note?: { id: string; text: string }
  collections: Collection[]
  libraries: User[]
```

#### `GET /api/cards/:cardId/libraries` (`getLibrariesForCard`)

```ts
Request: cardId: string  // path param

Response: GetLibrariesForCardResponse
  cardId: string
  users: User[]
  totalCount: number
```

#### `GET /api/cards/library/status` (`getUrlStatusForMyLibrary`)

```ts
Request: GetUrlStatusForMyLibraryParams (query params)
  url: string

Response: GetUrlStatusForMyLibraryResponse
  card?: UrlCard
  collections?: Collection[]
```

#### `GET /api/cards/libraries/url` (`getLibrariesForUrl`)

```ts
Request: GetLibrariesForUrlParams (query params)
  url: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'

Response: GetLibrariesForUrlResponse
  libraries: { user: User; card: UrlCard }[]
  pagination: Pagination
  sorting: CardSorting
```

#### `GET /api/cards/notes/url` (`getNoteCardsForUrl`)

```ts
Request: GetNoteCardsForUrlParams (query params)
  url: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'

Response: GetNoteCardsForUrlResponse
  notes: { id: string; note: string; author: User; createdAt: string; updatedAt: string }[]
  pagination: Pagination
  sorting: CardSorting
```

#### `GET /api/cards/search` (`searchUrls`)

```ts
Request: SearchUrlsParams (query params)
  searchQuery: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  urlType?: UrlType

Response: SearchUrlsResponse
  urls: UrlView[]
  pagination: Pagination
  sorting: CardSorting
```

#### `GET /api/collections` (`getMyCollections`)

```ts
Request: GetMyCollectionsParams (query params)
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  searchText?: string

Response: GetCollectionsResponse
  collections: Collection[]
  pagination: Pagination
  sorting: CollectionSorting
```

#### `GET /api/collections/:collectionId` (`getCollectionPage`)

```ts
Request: collectionId: string  // path param
  + GetCollectionPageParams (query params):
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    urlType?: UrlType

Response: GetCollectionPageResponse (extends Collection)
  id: string
  uri?: string
  name: string
  author: User
  description?: string
  accessType?: CollectionAccessType
  cardCount: number
  createdAt: string
  updatedAt: string
  isFollowing?: boolean
  followerCount?: number
  urlCards: UrlCard[]
  pagination: Pagination
  sorting: CardSorting
```

#### `GET /api/collections/at/:handle/:recordKey` (`getCollectionPageByAtUri`)

```ts
Request: GetCollectionPageByAtUriParams
  handle: string   // path param
  recordKey: string  // path param
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  urlType?: UrlType

Response: GetCollectionPageResponse (same as above)
```

#### `GET /api/collections/user/:identifier` (`getCollections`)

```ts
Request: GetCollectionsParams
  identifier: string  // path param (DID or handle)
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  searchText?: string

Response: GetCollectionsResponse
  collections: Collection[]
  pagination: Pagination
  sorting: CollectionSorting
```

#### `GET /api/collections/url` (`getCollectionsForUrl`)

```ts
Request: GetCollectionsForUrlParams (query params)
  url: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'

Response: GetCollectionsForUrlResponse
  collections: Collection[]
  pagination: Pagination
  sorting: CollectionSorting
```

#### `GET /api/collections/contributed/:identifier` (`getOpenCollectionsWithContributor`)

```ts
Request: GetOpenCollectionsWithContributorParams
  identifier: string  // path param (DID or handle)
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'

Response: GetCollectionsResponse
  collections: Collection[]
  pagination: Pagination
  sorting: CollectionSorting
```

#### `GET /api/collections/search` (`searchCollections`)

```ts
Request: SearchCollectionsParams (query params)
  searchText?: string
  identifier?: string
  accessType?: CollectionAccessType
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'

Response: GetCollectionsResponse
  collections: Collection[]
  pagination: Pagination
  sorting: CollectionSorting
```

#### `GET /api/collections/:collectionId/followers` (`getCollectionFollowers`)

```ts
Request: GetCollectionFollowersParams
  collectionId: string  // path param
  page?: number
  limit?: number

Response: GetCollectionFollowersResponse
  users: User[]
  pagination: Pagination
```

#### `GET /api/collections/:collectionId/followers/count` (`getCollectionFollowersCount`)

```ts
Request: GetCollectionFollowersCountParams;
collectionId: string; // path param

Response: GetFollowCountResponse;
count: number;
```

#### `GET /api/collections/:collectionId/contributors` (`getCollectionContributors`)

```ts
Request: GetCollectionContributorsParams
  collectionId: string  // path param
  page?: number
  limit?: number

Response: GetCollectionContributorsResponse
  users: ContributorUser[]
  pagination: Pagination
```

#### `GET /api/users/me` (`getMyProfile`)

```ts
Request: { includeStats?: boolean }  // query params

Response: GetProfileResponse (= User)
  id: string
  name: string
  handle: string
  avatarUrl?: string
  bannerUrl?: string
  description?: string
  isFollowing?: boolean
  followsYou?: boolean
  followerCount?: number
  followingCount?: number
  followedCollectionsCount?: number
  urlCardCount?: number
  collectionCount?: number
  connectionCount?: number
  connectionsByType?: { total: number; [type: string]: number }
  labels?: Label[]
```

#### `GET /api/users/:identifier` (`getProfile`)

```ts
Request: GetProfileParams
  identifier: string  // path param (DID or handle)
  includeStats?: boolean

Response: GetProfileResponse (= User, same as above)
```

#### `GET /api/users/login` (`initiateOAuthSignIn`)

```ts
Request: InitiateOAuthSignInRequest (query params)
  handle?: string

Response: InitiateOAuthSignInResponse
  authUrl: string
```

#### `GET /api/users/oauth/callback` (`completeOAuthSignIn`)

```ts
Request: CompleteOAuthSignInRequest (query params)
  code: string
  state: string
  iss: string

Response: CompleteOAuthSignInResponse
  accessToken: string
  refreshToken: string
```

#### `GET /api/users/extension/tokens` (`generateExtensionTokens`)

```ts
Request: GenerateExtensionTokensRequest; // no params

Response: GenerateExtensionTokensResponse;
accessToken: string;
refreshToken: string;
```

#### `GET /api/users/:identifier/following` (`getFollowingUsers`)

```ts
Request: GetFollowingUsersParams
  identifier: string  // path param (DID or handle)
  page?: number
  limit?: number

Response: GetFollowingUsersResponse
  users: User[]
  pagination: Pagination
```

#### `GET /api/users/:identifier/followers` (`getFollowers`)

```ts
Request: GetFollowersParams
  identifier: string  // path param (DID or handle)
  page?: number
  limit?: number

Response: GetFollowersResponse
  users: User[]
  pagination: Pagination
```

#### `GET /api/users/:identifier/following-collections` (`getFollowingCollections`)

```ts
Request: GetFollowingCollectionsParams
  identifier: string  // path param (DID or handle)
  page?: number
  limit?: number

Response: GetFollowingCollectionsResponse
  collections: Collection[]
  pagination: Pagination
```

#### `GET /api/users/:identifier/following/count` (`getFollowingCount`)

```ts
Request: GetFollowingCountParams;
identifier: string; // path param (DID or handle)

Response: GetFollowCountResponse;
count: number;
```

#### `GET /api/users/:identifier/followers/count` (`getFollowersCount`)

```ts
Request: GetFollowersCountParams;
identifier: string; // path param (DID or handle)

Response: GetFollowCountResponse;
count: number;
```

#### `GET /api/users/:identifier/following-collections/count` (`getFollowingCollectionsCount`)

```ts
Request: GetFollowingCollectionsCountParams;
identifier: string; // path param (DID or handle)

Response: GetFollowCountResponse;
count: number;
```

#### `GET /api/feeds/global` (`getGlobalFeed`)

```ts
Request: GetGlobalFeedParams (query params)
  page?: number
  limit?: number
  beforeActivityId?: string
  urlType?: UrlType
  source?: ActivitySource
  activityTypes?: string[]
  includeKnownBots?: boolean

Response: GetGlobalFeedResponse
  activities: FeedItem[]
  pagination: FeedPagination
```

#### `GET /api/feeds/gem` (`getGemsActivityFeed`)

```ts
Request: GetGemActivityFeedParams (query params)
  page?: number
  limit?: number
  urlType?: UrlType
  source?: ActivitySource
  activityTypes?: string[]
  includeKnownBots?: boolean

Response: GetGlobalFeedResponse
  activities: FeedItem[]
  pagination: FeedPagination
```

#### `GET /api/feeds/following` (`getFollowingFeed`)

```ts
Request: GetFollowingFeedParams (query params)
  page?: number
  limit?: number
  beforeActivityId?: string
  urlType?: UrlType
  source?: ActivitySource
  activityTypes?: string[]
  includeKnownBots?: boolean

Response: GetGlobalFeedResponse
  activities: FeedItem[]
  pagination: FeedPagination
```

#### `GET /api/notifications` (`getMyNotifications`)

```ts
Request: GetMyNotificationsParams (query params)
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  unreadOnly?: boolean

Response: GetMyNotificationsResponse
  notifications: NotificationItem[]
  pagination: Pagination
  unreadCount: number
```

#### `GET /api/notifications/unread-count` (`getUnreadNotificationCount`)

```ts
Request: none;

Response: GetUnreadNotificationCountResponse;
unreadCount: number;
```

#### `GET /api/connections/url` (`getConnectionsForUrl`)

```ts
Request: GetConnectionsForUrlParams (query params)
  url: string
  direction?: 'forward' | 'backward' | 'both'
  connectionTypes?: ConnectionType[]
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'

Response: GetConnectionsForUrlResponse
  connections: ConnectionWithSourceAndTarget[]
  pagination: Pagination
  sorting: ConnectionSorting
```

#### `GET /api/connections/user/:identifier` (`getConnections`)

```ts
Request: GetConnectionsParams
  identifier: string  // path param (DID or handle)
  connectionTypes?: ConnectionType[]
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'

Response: GetConnectionsResponse
  connections: ConnectionWithSourceAndTarget[]
  pagination: Pagination
  sorting: ConnectionSorting
```

#### `GET /api/search/similar-urls` (`getSimilarUrlsForUrl`)

```ts
Request: GetSimilarUrlsForUrlParams (query params)
  url: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  threshold?: number
  urlType?: string

Response: GetSimilarUrlsForUrlResponse
  urls: UrlView[]
  pagination: Pagination
```

#### `GET /api/search/semantic` (`semanticSearchUrls`)

```ts
Request: SemanticSearchUrlsParams (query params)
  query: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  threshold?: number
  urlType?: string
  identifier?: string

Response: SemanticSearchUrlsResponse
  urls: UrlView[]
  pagination: Pagination
```

#### `GET /api/search/bsky-posts` (`searchBskyPosts`)

```ts
Request: SearchBskyPostsForUrlParams (query params)
  q: string
  sort?: 'top' | 'latest' | string
  since?: string
  until?: string
  mentions?: string
  author?: string
  lang?: string
  domain?: string
  url?: string
  tag?: string[]
  limit?: number
  cursor?: string

Response: SearchBskyPostsForUrlResponse
  cursor?: string
  hitsTotal?: number
  posts: PostView[]
```

#### `GET /api/search/accounts` (`searchAtProtoAccounts`)

```ts
Request: SearchAtProtoAccountsParams (query params)
  term?: string  // deprecated, use q
  q?: string
  limit?: number
  cursor?: string

Response: SearchAtProtoAccountsResponse
  cursor?: string
  actors: ProfileView[]
```

#### `GET /api/search/leaflet-docs` (`searchLeafletDocs`)

```ts
Request: SearchLeafletDocsForUrlParams (query params)
  url: string
  limit?: number
  cursor?: string

Response: SearchLeafletDocsForUrlResponse
  urls: UrlView[]
  cursor?: string
  total: number
```

#### `GET /api/graph/data` (`getGraphData`)

```ts
Request: GetGraphDataParams (query params)
  page?: number
  limit?: number

Response: GetGraphDataResponse
  nodes: GraphNode[]
  edges: GraphEdge[]
  pagination: Pagination
```

#### `GET /api/graph/user/:identifier` (`getUserGraphData`)

```ts
Request: GetUserGraphDataParams
  identifier: string  // path param (DID or handle)
  page?: number
  limit?: number

Response: GetGraphDataResponse
  nodes: GraphNode[]
  edges: GraphEdge[]
  pagination: Pagination
```

#### `GET /api/graph/url` (`getUrlGraphData`)

```ts
Request: GetUrlGraphDataParams (query params)
  url: string
  depth?: number  // 1-5, defaults to 1

Response: GetGraphDataResponse
  nodes: GraphNode[]
  edges: GraphEdge[]
  pagination: Pagination
```

---

### Commands

#### `POST /api/cards/library/urls` (`addUrlToLibrary`)

```ts
Request: AddUrlToLibraryRequest
  url: string
  note?: string
  collectionIds?: string[]
  viaCardId?: string

Response: AddUrlToLibraryResponse
  urlCardId: string
  noteCardId?: string
```

#### `POST /api/cards/library` (`addCardToLibrary`)

```ts
Request: AddCardToLibraryRequest
  cardId: string
  collectionIds?: string[]

Response: AddCardToLibraryResponse
  cardId: string
```

#### `POST /api/cards/collections` (`addCardToCollection`)

```ts
Request: AddCardToCollectionRequest
  cardId: string
  collectionIds: string[]

Response: AddCardToCollectionResponse
  cardId: string
```

#### `PUT /api/cards/:cardId/note` (`updateNoteCard`)

```ts
Request: UpdateNoteCardRequest;
cardId: string; // path param
note: string;

Response: UpdateNoteCardResponse;
cardId: string;
```

#### `PUT /api/cards/url/associations` (`updateUrlCardAssociations`)

```ts
Request: UpdateUrlCardAssociationsRequest
  cardId: string
  note?: string
  addToCollections?: string[]
  removeFromCollections?: string[]
  viaCardId?: string

Response: UpdateUrlCardAssociationsResponse
  urlCardId: string
  noteCardId?: string
  addedToCollections: string[]
  removedFromCollections: string[]
```

#### `DELETE /api/cards/:cardId/library` (`removeCardFromLibrary`)

```ts
Request: RemoveCardFromLibraryRequest;
cardId: string; // path param

Response: RemoveCardFromLibraryResponse;
cardId: string;
```

#### `DELETE /api/cards/:cardId/collections` (`removeCardFromCollection`)

```ts
Request: RemoveCardFromCollectionRequest
  cardId: string   // path param
  collectionIds: string[]  // query param (comma-separated)

Response: RemoveCardFromCollectionResponse
  cardId: string
```

#### `POST /api/collections` (`createCollection`)

```ts
Request: CreateCollectionRequest
  name: string
  description?: string
  accessType?: CollectionAccessType

Response: CreateCollectionResponse
  collectionId: string
```

#### `PUT /api/collections/:collectionId` (`updateCollection`)

```ts
Request: UpdateCollectionRequest
  collectionId: string  // path param
  name: string
  description?: string
  accessType?: CollectionAccessType

Response: UpdateCollectionResponse
  collectionId: string
```

#### `DELETE /api/collections/:collectionId` (`deleteCollection`)

```ts
Request: DeleteCollectionRequest;
collectionId: string; // path param

Response: DeleteCollectionResponse;
collectionId: string;
```

#### `POST /api/users/login/app-password` (`loginWithAppPassword`)

```ts
Request: LoginWithAppPasswordRequest;
identifier: string;
appPassword: string;

Response: LoginWithAppPasswordResponse;
accessToken: string;
refreshToken: string;
```

#### `POST /api/users/oauth/refresh` (`refreshAccessToken`)

```ts
Request: RefreshAccessTokenRequest;
refreshToken: string;

Response: RefreshAccessTokenResponse;
accessToken: string;
refreshToken: string;
```

#### `POST /api/users/logout` (`logout`)

```ts
Request: (none — refreshToken sent via cookie)

Response: { success: boolean; message: string }
```

#### `POST /api/users/follows` (`followTarget`)

```ts
Request: FollowTargetRequest;
targetId: string; // DID or Collection UUID
targetType: 'USER' | 'COLLECTION';

Response: FollowTargetResponse;
followId: string;
```

#### `DELETE /api/users/follows/:targetId/:targetType` (`unfollowTarget`)

```ts
Request: targetId: string, targetType: 'USER' | 'COLLECTION'  // path params

Response: void
```

#### `POST /api/notifications/mark-read` (`markNotificationsAsRead`)

```ts
Request: MarkNotificationsAsReadRequest
  notificationIds: string[]

Response: MarkNotificationsAsReadResponse
  markedCount: number
```

#### `POST /api/notifications/mark-all-read` (`markAllNotificationsAsRead`)

```ts
Request: none;

Response: MarkAllNotificationsAsReadResponse;
markedCount: number;
```

#### `POST /api/connections` (`createConnection`)

```ts
Request: CreateConnectionRequest
  sourceType: 'URL' | 'CARD'
  sourceValue: string
  targetType: 'URL' | 'CARD'
  targetValue: string
  connectionType?: ConnectionType
  note?: string

Response: CreateConnectionResponse
  connectionId: string
```

#### `PUT /api/connections/:connectionId` (`updateConnection`)

```ts
Request: UpdateConnectionRequest
  connectionId: string  // path param
  connectionType?: ConnectionType
  note?: string
  removeNote?: boolean
  swap?: boolean

Response: UpdateConnectionResponse
  connectionId: string
```

#### `DELETE /api/connections/:connectionId` (`deleteConnection`)

```ts
Request: DeleteConnectionRequest;
connectionId: string; // path param

Response: DeleteConnectionResponse;
connectionId: string;
```
