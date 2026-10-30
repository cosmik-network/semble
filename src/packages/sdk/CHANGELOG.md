# sdk-v0.0.11 - 2026-10-30

This release adds #tag endpoints, adds three recommendation endpoints to the SDK, and adds a new notification type for @mentions.

Tags are written inline as `#tag` in note cards, connection notes and collection descriptions. They are matched case-insensitively.

## New endpoints

### Tags (`tags` contract)

- `getTags` (`GET /network.cosmik.tag.list`): recently used tags, intended for autocomplete. Authentication is optional. Query: `GetTagsParams` (optional `q`, `limit`, default 20, max 50). Returns `GetTagsResponse` (`tags: TagSummary[]`, most recently used first).
  - With `q`, returns tags from recent activity across Semble that start with `q`. A leading `#` is ignored.
  - Without `q`, returns the authenticated user's own recent tags. Unauthenticated requests without `q` return an empty list.
- `taggedItems` (`GET /network.cosmik.tag.getItems`): paginated list, newest first, of items whose note or description contains the given tag. Authentication is optional. Query: `GetTaggedItemsParams` (`tag`, optional `itemType: 'card' | 'connection' | 'collection'`, `user` as a DID or handle, `page`, `limit`, default 20, max 100). Returns `GetTaggedItemsResponse`.
  - Without `itemType`, `items` holds one list mixing all three types, newest first, as a `TaggedItem` union keyed on `type`.
  - With `itemType`, the response echoes `itemType` and fills exactly one of `cards`, `connections` or `collections`. `items` is omitted.
  - `user` limits results to that account's items.
  - Returns 400 if `tag` is missing or empty, or if `user` is malformed or cannot be resolved.

New shared types: `GetTagsParams`, `GetTagsResponse`, `TagSummary` (`tag`, `lastUsed`), `GetTaggedItemsParams`, `GetTaggedItemsResponse`, `TaggedItem`, `TaggedItemType`.

### Recommendations (`search` contract)

These endpoints already existed but were not part of the SDK until now.

- `recommended` (`GET /network.cosmik.search.getRecommended`): URLs recommended for a set of query strings. Authentication is optional. Query: `RecommendedUrlsParams` (optional `queries`, `page`, `limit`, default 10, max 100, `urlType`, and ranking weight overrides `urlCardWeight`, `noteWeight`, `collectionWeight`, `connectionWeight`, `randomness`). Returns `RecommendedUrlsResponse` (`urls: UrlView[]`, `queries`, `pagination`).
  - Each query's matches are ranked separately by network activity, then interleaved so that no single query dominates. URLs the authenticated user has already saved are excluded.
  - Without `queries`, the server picks queries from the authenticated user's recent cards (falling back to their profile bio), or from the global feed when unauthenticated. The response returns the `queries` it used. Pass them back when requesting later pages to keep the same result set.
- `recommendedUsers` (`GET /network.cosmik.search.getRecommendedUsers`): users recommended for a set of URLs. These are users who saved or connected those URLs, plus Semble users you follow on Bluesky. Users you already follow are excluded. Requires authentication. Query: `RecommendedUsersParams` (`urls`, required, one or more). Returns `RecommendedUsersResponse` (`users: RecommendedUser[]`, up to 40, and `bskyFollowedSembleUserCount`). `RecommendedUser` is `User` plus `followsOnBsky: boolean`. Returns 400 if `urls` is missing.
- `recommendedCollections` (`GET /network.cosmik.search.getRecommendedCollections`): collections containing any of the given URLs, ranked by card count, followers, how recently they were updated, and whether you follow the author on Bluesky. Authentication is optional. Query: `RecommendedCollectionsParams` (optional `urls`). Returns `RecommendedCollectionsResponse` (`collections: RecommendedCollection[]`, up to 20). `RecommendedCollection` is `Collection` plus `authorFollowedOnBsky: boolean`.
  - Authenticated callers must pass at least one URL, or the request returns 400.
  - Unauthenticated callers may omit `urls`. The server then picks URLs from the global feed, and `authorFollowedOnBsky` is always `false`.

For `urls` and `queries`, repeat the query parameter to pass several values.

New shared types: `RecommendedUrlsParams`, `RecommendedUrlsResponse`, `RecommendedUsersParams`, `RecommendedUsersResponse`, `RecommendedUser`, `RecommendedCollectionsParams`, `RecommendedCollectionsResponse`, `RecommendedCollection`.

## Modified types

- `NotificationType` has a new value, `USER_MENTIONED_YOU`. It is sent when someone @mentions your handle in a note card, connection note or collection description.
- `NotificationItem` has a new union member, `MentionNotificationItem`. Its `mentionSource` field (`'NOTE' | 'CONNECTION' | 'COLLECTION'`) says which kind of item contains the mention. Exactly one matching field is set: `card` for `NOTE`, `connection` for `CONNECTION`, or `mentionCollection` for `COLLECTION`.

  This only adds a type, so existing code keeps compiling. Any exhaustive `switch` over `NotificationType` or `NotificationItem` will need a case for the new value.

New shared types: `MentionNotificationItem`, `MentionSource`.

## Modified endpoints

- `myNotifications` (`GET /network.cosmik.notification.list`) can now return `USER_MENTIONED_YOU` items.

# sdk-v0.0.10 - 2026-08-26

No new or removed endpoints. This release makes one endpoint usable without authentication and lets it target any account.

## Modified endpoints

- `bskyFollowingFeed` (`GET /network.cosmik.feed.getBskyFollowing`) — authentication is now optional, and the feed can be fetched for any account rather than only your own.

  Pass the new optional `identifier` (a DID or handle) to get the feed of Semble users that account follows on Bluesky. Omit it and the feed defaults to the authenticated user, exactly as before — existing authenticated calls are unaffected.

  A request with neither authentication nor `identifier` returns 400, as does an `identifier` that is malformed or cannot be resolved. Previously an unauthenticated request returned 401.

  When you are authenticated and also pass `identifier`, the feed is that account's follows seen through your eyes: viewer-specific fields (`urlInLibrary`, `urlIsConnected`, collection `isFollowing`) still reflect you, not the account named by `identifier`. Unauthenticated requests omit those fields.

## Modified types

- `GetBskyFollowingFeedParams` — added optional `identifier: string`. This is a widening, so existing code keeps compiling.

# sdk-v0.0.9 - 2026-08-26

## New endpoints

- `recommendedCollectionsForUrl` (`GET /network.cosmik.collection.getRecommendedForUrl`) — recommends which collections to save a URL to, based on semantic similarity. Returns two sets in one response: `myCollections`, the authenticated user's own collections that contain URLs similar to the given URL, and `openCollections`, open collections from across the network that do the same, excluding the user's own. Each set is ranked by how many similar URLs the collection contains, and `limit` applies to each set independently. Requires authentication. Query: `GetRecommendedCollectionsForUrlParams` (`url`, optional `limit`). Returns `GetRecommendedCollectionsForUrlResponse` (`myCollections: Collection[]`, `openCollections: Collection[]`).

New shared types: `GetRecommendedCollectionsForUrlParams`, `GetRecommendedCollectionsForUrlResponse`.

# sdk-v0.0.8 - 2026-08-25

No new or removed endpoints. This release widens one shared type.

## Modified types

- `ConnectionType` — added two values: `SAME_AS` (source and target are the same thing in a different place, e.g. a mirror, reupload or DOI) and `REFERENCES` (source cites or points to the target). The existing eight values are unchanged.

  Because this is a widening, existing code keeps compiling. Note that any exhaustive `switch` or mapping over `ConnectionType` will now need to handle the two new values, and endpoints that return a `connectionType` may return them.

## Modified endpoints

The new values are accepted and returned wherever `ConnectionType` already appeared:

- `createConnection` (`POST /network.cosmik.connection.create`) — `connectionType` accepts the new values.
- `updateConnection` (`POST /network.cosmik.connection.update`) — `connectionType` accepts the new values.
- `connectionsForUrl` (`GET /network.cosmik.connection.getForUrl`) — the `connectionTypes` filter accepts the new values.
- `connectionsByUser` (`GET /network.cosmik.connection.listByUser`) — the `connectionTypes` filter accepts the new values.

# sdk-v0.0.7 - 2026-08-25

## New endpoints

- `bskyFollowingFeed` (`GET /network.cosmik.feed.getBskyFollowing`) — activity feed of the Semble users you follow on Bluesky. Requires authentication. Query: `GetBskyFollowingFeedParams` (`page`, `limit`, optional `beforeActivityId`, `urlType`, `source`, `activityTypes`, `includeKnownBots`). Returns `GetGlobalFeedResponse`, the same shape as the global and following feeds.

New shared type: `GetBskyFollowingFeedParams`.

# sdk-v0.0.6 - 2026-08-20

No new or removed endpoints. This release fixes response payloads and changes the behaviour of one endpoint.

## Modified types

- `UrlMetadata` — endpoints that returned URL metadata were silently dropping fields depending on which one you called. Every endpoint that returns `UrlMetadata` now returns the full field set: `url`, `title`, `description`, `author`, `publishedDate`, `siteName`, `imageUrl`, `type`, `retrievedAt`, `doi`, `isbn`. Fields still absent for a given URL remain `undefined`; nothing that was previously populated has changed shape.
  - `getUrlMetadata` (`GET /network.cosmik.cards.getUrlMetadata`) — `metadata` previously omitted `publishedDate`, `retrievedAt`, `doi` and `isbn`.
  - `getUrlConnections`, `getConnections` — stored source/target metadata previously omitted `publishedDate` and `retrievedAt`.
  - Connection responses in the global and following feeds — source/target `metadata` is now emitted in the same shape as everywhere else, with dates as ISO strings.
  - Connections created after this release persist `publishedDate` and `retrievedAt`, so those fields now survive round-trips instead of being lost on write.
- `publishedDate` and `retrievedAt` are always RFC-3339 strings when present. Unparseable or partial dates (e.g. a bare year from an upstream metadata source) are returned as `undefined` rather than an invalid date string.

## Modified endpoints

- `createConnection` (`POST /network.cosmik.cards.createConnection`) — two behaviour changes:
  - `connectionType` now defaults to `RELATED` when omitted. Previously the connection was stored with no type.
  - Creating a connection that is _exactly_ identical to one you already made — same source, target, `connectionType` and `note` — is now a no-op and returns the existing `connectionId` instead of creating a duplicate. Any difference in those fields still creates a new connection.

## Client identifier

The `client` option (sent as the `X-Semble-Client` header) is now validated. It is lowercased server-side and must then match `^[a-z0-9][a-z0-9_-]{0,31}$` (letters, digits, `-` and `_`; max 32 characters). Values that don't match are ignored — the request still succeeds, but the client isn't attributed.

# sdk-v0.0.5 - 2026-06-11

## New endpoints

### Subscriptions (`graph` contract)

- `subscribeToTarget` (`POST /network.cosmik.graph.subscribe`) — marks an existing follow as subscribed. Body: `SubscribeToTargetRequest` (`targetId`, `targetType: 'USER' | 'COLLECTION'`, optional `scopes: SubscriptionScope[]`). Returns `SubscribeToTargetResponse` (`followId`, `subscribedAt`, `scopes`).
- `unsubscribeFromTarget` (`POST /network.cosmik.graph.unsubscribe`) — clears the subscription flag on an existing follow (idempotent). Body: `UnsubscribeFromTargetRequest` (`targetId`, `targetType`). Returns `{ success: boolean }`.
- `updateSubscription` (`POST /network.cosmik.graph.updateSubscription`) — replaces the scope set on an existing subscription. Body: `UpdateSubscriptionRequest` (`targetId`, `targetType`, `scopes: SubscriptionScope[]` — min 1). Returns `UpdateSubscriptionResponse` (`followId`, `subscribedAt`, `scopes`).
- `getMySubscriptions` (`GET /network.cosmik.graph.getSubscriptions`) — lists the authenticated user's subscribed users and collections, ordered by `subscribedAt DESC`. Query: `GetMySubscriptionsParams` (optional `targetType`, `page`, `limit`). Returns `GetMySubscriptionsResponse` (`items: SubscriptionItem[]`, `pagination`).

New shared types: `SubscriptionScope` (`'CARD' | 'CONNECTION' | 'COLLECTION_SAVED'`), `SubscriptionItem` (discriminated union on `type: 'USER' | 'COLLECTION'`).

## Moved endpoints

The follow endpoints have moved from the `users` contract to the `graph` contract. Paths are unchanged; only the SDK namespace differs:

- `followTarget`, `unfollowTarget`
- `followingUsers`, `userFollowers`, `followingCollections`
- `followingCount`, `userFollowersCount`, `followingCollectionsCount`

## Modified types

- `User` — added optional `isSubscribed: boolean` and `subscriptionScopes: SubscriptionScope[]`. `UserProfileDTO` continues to omit these along with `isFollowing`.
- `Collection` — added optional `isSubscribed: boolean` and `subscriptionScopes: SubscriptionScope[]`.
- `NotificationType` — added `SUBSCRIBED_USER_ADDED_CARD`, `USER_ADDED_CARD_TO_SUBSCRIBED_COLLECTION`, `SUBSCRIBED_USER_MADE_CONNECTION`, `USER_ADDED_SUBSCRIBED_COLLECTION`, `USER_CONNECTED_SUBSCRIBED_COLLECTION`. The first three card/collection-add types extend `CardCollectionNotificationItem`; the connection types extend `ConnectionCreatedNotificationItem`.
