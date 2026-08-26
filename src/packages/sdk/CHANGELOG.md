# sdk-v0.0.9 - 2026-08-26

## New endpoints

- `recommendedCollectionsForUrl` (`GET /network.cosmik.collection.getRecommendedForUrl`) — recommends which of your own collections to save a URL to, based on semantic similarity: returns the authenticated user's collections that contain URLs similar to the given URL, ranked by how many similar URLs each collection contains. Requires authentication. Query: `GetRecommendedCollectionsForUrlParams` (`url`, optional `limit`). Returns `GetRecommendedCollectionsForUrlResponse` (`collections: Collection[]`).
- `recommendedOpenCollectionsForUrl` (`GET /network.cosmik.collection.getRecommendedOpenForUrl`) — same recommendation, but over open collections from across the network, excluding your own. Requires authentication. Query: `GetRecommendedOpenCollectionsForUrlParams` (`url`, optional `limit`). Returns `GetRecommendedOpenCollectionsForUrlResponse` (`collections: Collection[]`).

New shared types: `GetRecommendedCollectionsForUrlParams`, `GetRecommendedCollectionsForUrlResponse`, `GetRecommendedOpenCollectionsForUrlParams`, `GetRecommendedOpenCollectionsForUrlResponse`.

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
