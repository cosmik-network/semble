# iOS push notifications: contract

Status: **approved. Implemented behind `PUSH_NOTIFICATIONS_ENABLED` (default on).**

This file is the interface between this repo and the iOS repo. The in-app
notification tab stays the source of truth. APNs push is an additive,
best-effort doorbell on top of it.

## 0. Decisions

These depart from, or fill gaps in, the task brief. All are approved.

| #   | Decision                                                                                                                                                                          | Why                                                                                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Token uniqueness is on `token` alone, not `(user_id, token)`. Registering an existing token **moves it** to the caller.                                                           | An APNs token identifies one app install on one device. With a `(user_id, token)` key, user A logs out, user B logs in on the same phone, and A's row survives. A's notifications then ring on B's phone. That is a privacy leak. |
| D2  | Endpoints follow the repo's XRPC-style naming (`/network.cosmik.device.registerPushToken`, POST). There is no `DELETE /devices/...`.                                              | Every route in the repo is `GET` or `POST` on a `network.cosmik.<ns>.<verb>` path, defined in `src/types` and `src/contract`. A REST-style route would be the only one.                                                           |
| D3  | OS permission status rides on the register endpoint. No PATCH.                                                                                                                    | The app calls register on every foreground anyway. One idempotent upsert covers token refresh, permission change and `last_seen`.                                                                                                 |
| D4  | `deep_link` is `semble://notifications?id=<notification_id>` for every type in v1.                                                                                                | The web app has no per-notification route. The worker would need handle and rkey lookups to build richer links. The app already knows how to render a notification from its id.                                                   |
| D5  | No notification preferences exist today. Add a `notification_preferences` table with a global `push_enabled` (default `true`). Add `getPreferences` / `setPreferences` endpoints. | Without an endpoint, the toggle is unreachable. Default `true` is safe: no registered token means no push.                                                                                                                        |
| D6  | Push dedupe uses a Redis `SET NX` key derived from the notification content, not the notification id.                                                                             | Notification ids are random UUIDs minted per `save()`. A redelivered event mints a new id, so an id-based key never matches. See section 5.                                                                                       |
| D7  | `provisional` OS permission counts as pushable.                                                                                                                                   | iOS delivers provisional notifications quietly to the Notification Center. The brief says `authorized` only. Say so if you want it stricter.                                                                                      |
| D8  | Push copy is English only in v1. The stored `locale` is not used yet.                                                                                                             | Localisation needs `loc-key` strings shipped in the app bundle. That is a mobile-team decision.                                                                                                                                   |

## 1. Endpoints

All routes require auth via `authMiddleware.ensureAuthenticated()`. That
accepts the cookie, a bearer JWT or an API key. Errors use the existing shape:
`{ "message": string }`, plus `errors` (zod `flatten()`) on a 400.

### 1.1 Register or update a token

`POST /network.cosmik.device.registerPushToken`

```json
{
  "token": "a1b2...64 hex chars...",
  "platform": "ios",
  "osPermission": "authorized",
  "appVersion": "1.4.0",
  "osVersion": "18.2",
  "locale": "en-CA",
  "environment": "production"
}
```

| Field          | Type                                        | Rules                                                         |
| -------------- | ------------------------------------------- | ------------------------------------------------------------- |
| `token`        | string                                      | Hex, 64 to 200 chars. Lowercased server-side.                 |
| `platform`     | `"ios"`                                     | Only value in v1. The enum leaves room for others.            |
| `osPermission` | `"authorized" \| "provisional" \| "denied"` | Required. Current OS state at call time.                      |
| `appVersion`   | string                                      | Max 32 chars.                                                 |
| `osVersion`    | string                                      | Max 32 chars.                                                 |
| `locale`       | string                                      | BCP 47, max 35 chars.                                         |
| `environment`  | `"sandbox" \| "production"`                 | Which APNs host owns this token. Debug builds send `sandbox`. |

Response `200`: `{ "success": true }`.

Behaviour:

- Upsert keyed on `token`. A new token inserts a row. A known token updates it.
- If the token belongs to another user, `user_id` moves to the caller (D1).
- Every call sets `last_seen = now()` and clears `invalidated_at`.
- Calling with `osPermission: "denied"` keeps the row and records the state. The gate then skips it.
- Safe to call on every app foreground. Safe to retry.
- `environment` is needed because a sandbox token sent to the production host returns `BadDeviceToken`. The worker picks the host per token, so one deployment can serve TestFlight and dev builds.

### 1.2 Unregister a token (logout or uninstall)

`POST /network.cosmik.device.unregisterPushToken`

```json
{ "token": "a1b2..." }
```

Response `200`: `{ "success": true }`.

- Deletes the row only if `token` belongs to the caller.
- Returns `200` when the row is missing or belongs to someone else. This leaks nothing and keeps retries safe.
- The app calls this **before** it discards its session on logout. After uninstall nothing can call it. APNs returns `410 Unregistered` and the worker prunes the token (section 4).

### 1.3 Preferences

`GET /network.cosmik.notification.getPreferences` returns `{ "pushEnabled": true }`.

`POST /network.cosmik.notification.setPreferences` takes `{ "pushEnabled": false }` and returns the new state.

A user with no row reads as `pushEnabled: true`.

## 2. Schema

New table `device_tokens`. Drizzle schema at
`src/modules/notifications/infrastructure/repositories/schema/deviceToken.sql.ts`.
The migration comes from `npm run db:generate`. `createTestSchema.ts` gets the same DDL.

```sql
CREATE TABLE device_tokens (
  token          TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL,
  platform       TEXT NOT NULL,                  -- 'ios'
  environment    TEXT NOT NULL,                  -- 'sandbox' | 'production'
  os_permission  TEXT NOT NULL,                  -- 'authorized' | 'provisional' | 'denied'
  app_version    TEXT,
  os_version     TEXT,
  locale         TEXT,
  last_seen      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  invalidated_at TIMESTAMP WITH TIME ZONE,       -- set on APNs 410 / BadDeviceToken
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX device_tokens_user_id_idx ON device_tokens(user_id);
```

New table `notification_preferences`:

```sql
CREATE TABLE notification_preferences (
  user_id      TEXT PRIMARY KEY,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

Per-type toggles later: add a `notification_push_type_overrides (user_id, type, enabled)` table. The gate already takes the notification type as input, so nothing else changes.

The existing `notifications` table is **not touched**.

Not in this PR: a job that prunes tokens with an old `last_seen`. The gate does not filter on `last_seen`.

## 3. APNs payload

The app receives exactly this JSON.

```json
{
  "aps": {
    "alert": {
      "title": "Semble",
      "body": "alice.bsky.social added your card"
    },
    "badge": 3,
    "sound": "default"
  },
  "notification_id": "6f1c2c3e-9d0a-4c52-8a0e-2d5f6b1d9a77",
  "type": "USER_ADDED_YOUR_CARD",
  "deep_link": "semble://notifications?id=6f1c2c3e-9d0a-4c52-8a0e-2d5f6b1d9a77"
}
```

| Key               | Meaning                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `aps.alert.title` | Always `"Semble"` in v1.                                                                                                                |
| `aps.alert.body`  | One line from the copy table below.                                                                                                     |
| `aps.badge`       | Unread count for the recipient, read right after the row is written. Includes the new notification.                                     |
| `aps.sound`       | `"default"`.                                                                                                                            |
| `notification_id` | The `notifications.id` of the row behind this push. The app uses it to reconcile with the tab. It fetches the list and focuses this id. |
| `type`            | The `NotificationType` string. Informational. The app must tolerate unknown values.                                                     |
| `deep_link`       | `semble://notifications?id=<notification_id>` (D4). The app needs to register the `semble` URL scheme. See open question Q1.            |

Request headers the worker sets:

| Header             | Value                                                    |
| ------------------ | -------------------------------------------------------- |
| `apns-topic`       | The app bundle id (config)                               |
| `apns-push-type`   | `alert`                                                  |
| `apns-priority`    | `10`                                                     |
| `apns-expiration`  | now + 24 h (epoch seconds)                               |
| `apns-collapse-id` | **Not set.** Every notification is delivered separately. |

Reconciliation rules for the app:

1. A push can arrive for a row the app already shows. Match on `notification_id` and do not add a second entry.
2. A push can be lost. The tab is always the truth. Fetch it on foreground.
3. `aps.badge` is a hint. The app may overwrite it from `getUnreadCount`.

Copy table (`{actor}` is the actor's handle, or `"Someone"` when it is unknown):

| Type                                       | Body                                              |
| ------------------------------------------ | ------------------------------------------------- |
| `USER_ADDED_YOUR_CARD`                     | `{actor} added your card`                         |
| `USER_ADDED_YOUR_BSKY_POST`                | `{actor} added your Bluesky post`                 |
| `USER_ADDED_YOUR_COLLECTION`               | `{actor} added your collection`                   |
| `USER_ADDED_TO_YOUR_COLLECTION`            | `{actor} added a card to your collection`         |
| `USER_FOLLOWED_YOU`                        | `{actor} followed you`                            |
| `USER_FOLLOWED_YOUR_COLLECTION`            | `{actor} followed your collection`                |
| `USER_CONNECTED_YOUR_URL`                  | `{actor} connected your link`                     |
| `USER_CONNECTED_YOUR_POST`                 | `{actor} connected your post`                     |
| `USER_CONNECTED_YOUR_COLLECTION`           | `{actor} connected your collection`               |
| `USER_MENTIONED_YOU`                       | `{actor} mentioned you`                           |
| `SUBSCRIBED_USER_ADDED_CARD`               | `{actor} added a card`                            |
| `USER_ADDED_CARD_TO_SUBSCRIBED_COLLECTION` | `{actor} added a card to a collection you follow` |
| `SUBSCRIBED_USER_MADE_CONNECTION`          | `{actor} made a connection`                       |
| `USER_ADDED_SUBSCRIBED_COLLECTION`         | `{actor} added a collection you follow`           |
| `USER_CONNECTED_SUBSCRIBED_COLLECTION`     | `{actor} connected a collection you follow`       |

The copy is a first draft. To be reviewed. 

## 4. Preference gate

```ts
interface PushGateResult {
  shouldPush: boolean;
  tokens: { token: string; environment: 'sandbox' | 'production' }[];
}

gate(recipientUserId: string, type: NotificationType): Promise<PushGateResult>
```

Rules, in order:

1. Flag off: the gate is never built. The worker only wires push when the flag is on (section 5).
2. `notification_preferences.push_enabled = false`: no push.
3. Tokens for `recipientUserId` where `os_permission IN ('authorized','provisional')` and `invalidated_at IS NULL`.
4. No tokens: no push.

The gate never throws. A DB error returns `shouldPush: false` and logs it.

APNs error handling:

| APNs response                                                              | Action                                |
| -------------------------------------------------------------------------- | ------------------------------------- |
| `200`                                                                      | Done.                                 |
| `410` (`Unregistered`), `400 BadDeviceToken`, `400 DeviceTokenNotForTopic` | Set `invalidated_at`. Do not retry.   |
| `403 ExpiredProviderToken`                                                 | Refresh the provider JWT once, retry. |
| `429`, `5xx`, network error, timeout                                       | Retry (section 5).                    |
| Any other `4xx`                                                            | Log and drop. No retry.               |

The provider JWT (ES256, signed with the `.p8` key) is cached and refreshed every 40 minutes. APNs rejects tokens older than 60 minutes and those refreshed more often than every 20.

## 5. Worker fan-out

Where it hooks in. Every notification the worker writes goes through
`NotificationService`, which calls `INotificationRepository.save()` (15 call
sites, all create paths). The worker's repository is wrapped by a decorator,
`PushNotifyingNotificationRepository`:

```
handler -> NotificationService -> PushNotifyingNotificationRepository.save()
                                    1. inner.save(notification)        // existing write, unchanged
                                    2. if it failed: return its error, no push
                                    3. else: fan out (never throws)
```

No existing handler changes. The decorator is wired in `NotificationWorkerProcess`
only, and only when `PUSH_NOTIFICATIONS_ENABLED=true` and all four `APNS_*`
values are set. Otherwise the worker runs the plain repository. The web
process and the in-memory event mode (local dev) never send pushes.

Fan-out, in order:

1. Allowlist check (`PUSH_ALLOWLIST_DIDS`). When set and the recipient is not on it: return. The master flag is checked at wiring time, not here.
2. Gate. Not `shouldPush`: return.
3. **Dedupe.** `SET push:sent:<sha256(recipient|actor|type|metadata)> 1 EX 3600 NX` on the saga state store. `null` back means we already pushed this one: return. (D6)
4. Read the unread count and the actor handle. Build the payload.
5. Send to each token in parallel. Per token: up to 3 attempts, backoff 500 ms then 1500 ms, 5 s timeout per attempt. The whole step has a 15 s ceiling.
6. After the retries: log `push.dropped` with a counter and move on.

The step catches everything. The DB write has already committed. The handler returns `ok`. APNs trouble cannot fail the job, cannot trigger a BullMQ retry, and cannot poison the queue.

Dedupe, spelled out. Today a redelivered job can already write a second row,
because ids are random and the table has no unique key. This PR does not change
that. The dedupe key suppresses the second **push**, so a redelivery never rings
the phone twice. The 1 h TTL covers BullMQ's retry window (3 attempts, 2 s
exponential backoff). A user who really repeats the same action after an hour
gets a new push.

Only new events push. The decorator only sees `save()` calls made while a worker
handles a live event. Nothing replays or backfills history.

## 6. Config, secrets, flag

Environment variables, read in `EnvironmentConfigService` (new `getApnsConfig()`):

| Variable                     | Purpose                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUSH_NOTIFICATIONS_ENABLED` | Master flag. Default `false`.                                                                                                                   |
| `DEEP_LINK_TEMPLATE`         | Deep link with `{notificationId}`. Default `semble://notifications?id={notificationId}`. Switching to universal links later is a config change. |
| `PUSH_ALLOWLIST_DIDS`        | Optional, comma-separated. When set, only these recipients get pushes. For gradual rollout.                                                     |
| `APNS_KEY_P8`                | The `.p8` key, PEM or base64 PEM. Same parsing as `OAUTH_PRIVATE_KEY_PKCS8`.                                                                    |
| `APNS_KEY_ID`                | 10-char key id.                                                                                                                                 |
| `APNS_TEAM_ID`               | 10-char team id.                                                                                                                                |
| `APNS_BUNDLE_ID`             | Becomes `apns-topic`.                                                                                                                           |

Sandbox versus production is chosen per token (`environment` column), not by a global switch.

Secrets go in with `fly secrets set` per app (`semble-production`, development). Nothing goes in git. `.env.*` files in the repo get empty placeholders only.

The flag defaults off. With it off, the worker runs the plain repository code path and the new endpoints still work, so the iOS team can register tokens before rollout.

## 7. Not changed

- Existing event handlers, bundling saga, `NotificationService`, `CreateNotificationUseCase`.
- The `notifications` table, its indexes, and every existing notification endpoint.
- Queue config, BullMQ options, event routing.
- The web app and the notification tab.
- Users with no registered tokens: the gate returns no tokens and nothing else happens.

## 8. Resolved questions

- **Q1.** Deep link: `semble://notifications?id=<notification_id>` for v1. After the Apple Developer Program approval and an AASA file, switch to `https://semble.so/notifications?highlight=<notification_id>` by changing `DEEP_LINK_TEMPLATE`. No code change.
- **Q2.** API-key auth on `registerPushToken` is allowed in v1. JWT or session stays the primary path for the app.
- **Q3.** Retries run inline: 3 attempts, 15 s ceiling. Revisit a dedicated queue only if APNs latency hurts worker throughput.
- **Q4.** Copy is an English-only draft for all 15 types. Product reviews it before wider rollout. D8 stands.

---

## Appendix: Phase 1 discovery findings

**Worker architecture.** Seven entry points in `src/workers/*.ts`, each a `BaseWorkerProcess` subclass. Fly runs each as its own process (`fly.production.toml`). BullMQ on Redis, one queue per worker (`QueueNames`). The publisher fans each event out to the queues listed in `getTargetQueues`. Publishing is fire-and-forget. `BullMQEventSubscriber` runs every handler for an event concurrently with `Promise.allSettled`. If any handler fails, it rethrows and BullMQ retries the **whole job**. Notification queue options: 3 attempts, exponential backoff from 2 s, concurrency 10, keeps 50 completed and 25 failed. There is no consumer-group concept. Idempotency is per handler (lookups such as `findByConnectionAndActor`) plus a Redis-locked, 3 s bundling window for card events. Events carry no id. With `shouldUseInMemoryEvents()`, `InMemoryEventWorkerProcess` runs the same handlers inside the web process.

**Notification worker.** It consumes card added to library or collection (through `CardActivityBundlingSaga`), card removed, user followed or unfollowed, connection created, updated and removed, note card updated, and collection created and updated (mentions). All creates reach one place, `NotificationService`, then `INotificationRepository.save()`. The table is `notifications(id uuid pk, recipient_user_id, actor_user_id, type, metadata jsonb, read, created_at, updated_at)`. The id is a random UUID, `save()` upserts on id, and there is no unique business key. Ordering is `created_at DESC`, with no sequence. There are 15 notification types.

**API conventions.** Express. Routes are `GET`/`POST` only, named `/network.cosmik.<ns>.<verb>`. Paths and zod schemas live in `src/types`. ts-rest contracts live in `src/contract`. Routes register in a `registerXRoutes` function with `authMiddleware.ensureAuthenticated()` and `validateBody`/`validateQuery`. Controllers extend `Controller` and use `req.did`. Errors are `{ message }`, 400s add `errors`. There is no URL versioning. `src/packages/sdk` has its own changelog, so adding contract routes may need an SDK entry.

**Infrastructure.** Migrations: drizzle-kit, `*.sql.ts` schema files, `npm run db:generate`, plus a mirror in `createTestSchema.ts` (34 migrations so far). Config: `EnvironmentConfigService` reads env vars, and secrets are set with `fly secrets set`. There is a PEM/base64 parsing precedent in `OAUTH_PRIVATE_KEY_PKCS8`. There is **no feature-flag system**, only env-derived booleans such as `shouldUseMockAuth()`. Background retry exists as BullMQ queue options. HTTP clients are plain `fetch` in a few services. There is no HTTP/2 client, but `node:http2` is built in, and `jsonwebtoken` is already a dependency for ES256. No new packages are needed.

**FYI - validated assumptions** No notification preferences exist. No existing iOS deep-link scheme exists. No `DELETE` routes exist. Redelivered events can already produce duplicate rows.
