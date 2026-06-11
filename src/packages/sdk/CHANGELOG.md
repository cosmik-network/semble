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
