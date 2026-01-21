# oauth client node npm package

atproto OAuth Client for NodeJS

This package implements all the OAuth features required by ATPROTO (PKCE, etc.) to run in a NodeJS based environment such as desktop apps built with Electron or traditional web app backends built with frameworks like Express.
Setup
Client configuration

The client_id is what identifies your application to the OAuth server. It is used to fetch the client metadata, and to initiate the OAuth flow. The client_id must be a URL that points to the client metadata.

Your OAuth client metadata should be hosted at a URL that corresponds to the client_id of your application. This URL should return a JSON object with the client metadata. The client metadata should be configured according to the needs of your application, and must respect the ATPROTO.
From a backend service

The client_metadata object will typically be built by the backend at startup.

import { NodeOAuthClient, Session } from '@atproto/oauth-client-node'
import { JoseKey } from '@atproto/jwk-jose'

const client = new NodeOAuthClient({
// This object will be used to build the payload of the /client-metadata.json
// endpoint metadata, exposing the client metadata to the OAuth server.
clientMetadata: {
// Must be a URL that will be exposing this metadata
client_id: 'https://my-app.com/client-metadata.json',
client_name: 'My App',
client_uri: 'https://my-app.com',
logo_uri: 'https://my-app.com/logo.png',
tos_uri: 'https://my-app.com/tos',
policy_uri: 'https://my-app.com/policy',
redirect_uris: ['https://my-app.com/callback'],
grant_types: ['authorization_code', 'refresh_token'],
scope: 'atproto transition:generic',
response_types: ['code'],
application_type: 'web',
token_endpoint_auth_method: 'private_key_jwt',
token_endpoint_auth_signing_alg: 'RS256',
dpop_bound_access_tokens: true,
jwks_uri: 'https://my-app.com/jwks.json',
},

// Used to authenticate the client to the token endpoint. Will be used to
// build the jwks object to be exposed on the "jwks_uri" endpoint.
keyset: await Promise.all([
JoseKey.fromImportable(process.env.PRIVATE_KEY_1, 'key1'),
JoseKey.fromImportable(process.env.PRIVATE_KEY_2, 'key2'),
JoseKey.fromImportable(process.env.PRIVATE_KEY_3, 'key3'),
]),

// Interface to store authorization state data (during authorization flows)
stateStore: {
async set(key: string, internalState: NodeSavedState): Promise<void> {},
async get(key: string): Promise<NodeSavedState | undefined> {},
async del(key: string): Promise<void> {},
},

// Interface to store authenticated session data
sessionStore: {
async set(sub: string, session: Session): Promise<void> {},
async get(sub: string): Promise<Session | undefined> {},
async del(sub: string): Promise<void> {},
},

// A lock to prevent concurrent access to the session store. Optional if only one instance is running.
requestLock,
})

const app = express()

// Expose the metadata and jwks
app.get('client-metadata.json', (req, res) => res.json(client.clientMetadata))
app.get('jwks.json', (req, res) => res.json(client.jwks))

// Create an endpoint to initiate the OAuth flow
app.get('/login', async (req, res, next) => {
try {
const handle = 'some-handle.bsky.social' // eg. from query string
const state = '434321'

    // Revoke any pending authentication requests if the connection is closed (optional)
    const ac = new AbortController()
    req.on('close', () => ac.abort())

    const url = await client.authorize(handle, {
      signal: ac.signal,
      state,
      // Only supported if OAuth server is openid-compliant
      ui_locales: 'fr-CA fr en',
    })

    res.redirect(url)

} catch (err) {
next(err)
}
})

// Create an endpoint to handle the OAuth callback
app.get('/atproto-oauth-callback', async (req, res, next) => {
try {
const params = new URLSearchParams(req.url.split('?')[1])

    const { session, state } = await client.callback(params)

    // Process successful authentication here
    console.log('authorize() was called with state:', state)

    console.log('User authenticated as:', session.did)

    const agent = new Agent(session)

    // Make Authenticated API calls
    const profile = await agent.getProfile({ actor: agent.did })
    console.log('Bsky profile:', profile.data)

    res.json({ ok: true })

} catch (err) {
next(err)
}
})

// Whenever needed, restore a user's session
async function worker() {
const userDid = 'did:plc:123'

const oauthSession = await client.restore(userDid)

// Note: If the current access_token is expired, the session will automatically
// (and transparently) refresh it. The new token set will be saved though
// the client's session store.

const agent = new Agent(oauthSession)

// Make Authenticated API calls
const profile = await agent.getProfile({ actor: agent.did })
console.log('Bsky profile:', profile.data)
}

From a native application

This applies to mobile apps, desktop apps, etc. based on NodeJS (e.g. Electron).

The client metadata must be hosted on an internet-accessible URL owned by you. The client metadata will typically contain:

{
"client_id": "https://my-app.com/client-metadata.json",
"client_name": "My App",
"client_uri": "https://my-app.com",
"logo_uri": "https://my-app.com/logo.png",
"tos_uri": "https://my-app.com/tos",
"policy_uri": "https://my-app.com/policy",
"redirect_uris": ["https://my-app.com/atproto-oauth-callback"],
"scope": "atproto",
"grant_types": ["authorization_code", "refresh_token"],
"response_types": ["code"],
"application_type": "native",
"token_endpoint_auth_method": "none",
"dpop_bound_access_tokens": true
}

Instead of hard-coding the client metadata in your app, you can fetch it when the app starts:

import { NodeOAuthClient } from '@atproto/oauth-client-node'

const client = await NodeOAuthClient.fromClientId({
clientId: 'https://my-app.com/client-metadata.json',

stateStore: {
async set(key: string, internalState: NodeSavedState): Promise<void> {},
async get(key: string): Promise<NodeSavedState | undefined> {},
async del(key: string): Promise<void> {},
},

sessionStore: {
async set(sub: string, session: Session): Promise<void> {},
async get(sub: string): Promise<Session | undefined> {},
async del(sub: string): Promise<void> {},
},

// A lock to prevent concurrent access to the session store. Optional if only one instance is running.
requestLock,
})

    [!NOTE]

    There is no keyset in this instance. This is due to the fact that app clients cannot safely store a private key. The token_endpoint_auth_method is set to none in the client metadata, which means that the client will not be authenticating itself to the token endpoint. This will cause sessions to have a shorter lifetime. You can circumvent this by providing a "BFF" (Backend for Frontend) that will perform an authenticated OAuth flow and use a session id based mechanism to authenticate the client.

Common configuration options

The OAuthClient and OAuthAgent classes will manage and refresh OAuth tokens transparently. They are also responsible to properly format the HTTP requests payload, using DPoP, and transparently retrying requests when the access token expires.

For this to work, the client must be configured with the following options:
sessionStore

A simple key-value store to save the OAuth session data. This is used to save the access token, refresh token, and other session data.

const sessionStore: NodeSavedSessionStore = {
async set(sub: string, sessionData: NodeSavedSession) {
// Insert or update the session data in your database
await saveSessionDataToDb(sub, sessionData)
},

async get(sub: string) {
// Retrieve the session data from your database
const sessionData = await getSessionDataFromDb(sub)
if (!sessionData) return undefined

    return sessionData

},

async del(sub: string) {
// Delete the session data from your database
await deleteSessionDataFromDb(sub)
},
}

stateStore

A simple key-value store to save the state of the OAuth authorization flow. This is used to prevent CSRF attacks.

The implementation of the StateStore is similar to the sessionStore.

interface NodeSavedStateStore {
set: (key: string, internalState: NodeSavedState) => Promise<void>
get: (key: string) => Promise<NodeSavedState | undefined>
del: (key: string) => Promise<void>
}

One notable exception is that state store items can (and should) be deleted after a short period of time (one hour should be more than enough).
requestLock

When multiple instances of the client are running, this lock will prevent concurrent refreshes of the same session.

Here is an example implementation based on redlock:

import { RuntimeLock } from '@atproto/oauth-client-node'
import Redis from 'ioredis'
import Redlock from 'redlock'

const redisClients = new Redis()
const redlock = new Redlock(redisClients)

const requestLock: RuntimeLock = async (key, fn) => {
// 30 seconds should be enough. Since we will be using one lock per user id
// we can be quite liberal with the lock duration here.
const lock = await redlock.lock(key, 45e3)
try {
return await fn()
} finally {
await redlock.unlock(lock)
}
}

Usage with @atproto/api

@atproto/oauth-client-\* packages all return an ApiClient instance upon successful authentication. This instance can be used to make authenticated requests using all the ApiClient methods defined in [API] (non exhaustive list of examples below). Any refresh of the credentials will happen under the hood, and the new tokens will be saved in the session store.

const session = await client.restore('did:plc:123')
const agent = new Agent(session)

// Feeds and content
await agent.getTimeline(params, opts)
await agent.getAuthorFeed(params, opts)
await agent.getPostThread(params, opts)
await agent.getPost(params)
await agent.getPosts(params, opts)
await agent.getLikes(params, opts)
await agent.getRepostedBy(params, opts)
await agent.post(record)
await agent.deletePost(postUri)
await agent.like(uri, cid)
await agent.deleteLike(likeUri)
await agent.repost(uri, cid)
await agent.deleteRepost(repostUri)
await agent.uploadBlob(data, opts)

// Social graph
await agent.getFollows(params, opts)
await agent.getFollowers(params, opts)
await agent.follow(did)
await agent.deleteFollow(followUri)

// Actors
await agent.getProfile(params, opts)
await agent.upsertProfile(updateFn)
await agent.getProfiles(params, opts)
await agent.getSuggestions(params, opts)
await agent.searchActors(params, opts)
await agent.searchActorsTypeahead(params, opts)
await agent.mute(did)
await agent.unmute(did)
await agent.muteModList(listUri)
await agent.unmuteModList(listUri)
await agent.blockModList(listUri)
await agent.unblockModList(listUri)

// Notifications
await agent.listNotifications(params, opts)
await agent.countUnreadNotifications(params, opts)
await agent.updateSeenNotifications()

// Identity
await agent.resolveHandle(params, opts)
await agent.updateHandle(params, opts)

// etc.

// Always remember to revoke the credentials when you are done
await session.signOut()

Advances use-cases
Listening for session updates and deletion

The OAuthClient will emit events whenever a session is updated or deleted.

import {
Session,
TokenRefreshError,
TokenRevokedError,
} from '@atproto/oauth-client-node'

client.addEventListener('updated', (event: CustomEvent<Session>) => {
console.log('Refreshed tokens were saved in the store:', event.detail)
})

client.addEventListener(
'deleted',
(
event: CustomEvent<{
sub: string
cause: TokenRefreshError | TokenRevokedError | unknown
}>,
) => {
console.log('Session was deleted from the session store:', event.detail)

    const { cause } = event.detail

    if (cause instanceof TokenRefreshError) {
      // - refresh_token unavailable or expired
      // - oauth response error (`cause.cause instanceof OAuthResponseError`)
      // - session data does not match expected values returned by the OAuth server
    } else if (cause instanceof TokenRevokedError) {
      // Session was revoked through:
      // - session.signOut()
      // - client.revoke(sub)
    } else {
      // An unexpected error occurred, causing the session to be deleted
    }

},
)

Silent Sign-In

Using silent sign-in requires to handle retries on the callback endpoint.

app.get('/login', async (req, res) => {
const handle = 'some-handle.bsky.social' // eg. from query string
const user = req.user.id

const url = await client.authorize(handle, {
// Use "prompt=none" to attempt silent sign-in
prompt: 'none',

    // Build an internal state to map the login request to the user, and allow retries
    state: JSON.stringify({
      user,
      handle,
    }),

})

res.redirect(url)
})

app.get('/atproto-oauth-callback', async (req, res) => {
const params = new URLSearchParams(req.url.split('?')[1])
try {
try {
const { session, state } = await client.callback(params)

      // Process successful authentication here. For example:

      const agent = new Agent(session)

      const profile = await agent.getProfile({ actor: agent.did })

      console.log('Bsky profile:', profile.data)
    } catch (err) {
      // Silent sign-in failed, retry without prompt=none
      if (
        err instanceof OAuthCallbackError &&
        ['login_required', 'consent_required'].includes(err.params.get('error'))
      ) {
        // Parse previous state
        const { user, handle } = JSON.parse(err.state)

        const url = await client.authorize(handle, {
          // Note that we omit the prompt parameter here. Setting "prompt=none"
          // here would result in an infinite redirect loop.

          // Build a new state (or re-use the previous one)
          state: JSON.stringify({
            user,
            handle,
          }),
        })

        // redirect to new URL
        res.redirect(url)

        return
      }

      throw err
    }

} catch (err) {
next(err)
}
})

# example errors

    2026-01-20 16:09:03.545

Error: Failed to fetch user profile: Failed to get authenticated agent for BlueskyProfileService: Failed to authenticate: No valid OAuth or App Password session found. OAuth error: OAuth authentication failed: The session was deleted by another process. App Password error: App Password session failed: No session found for DID: did:plc:dnaonrdiuvgepft6heblocle
2026-01-20 16:09:03.342
Error: Failed to fetch user profile: Failed to get authenticated agent for BlueskyProfileService: Failed to authenticate: No valid OAuth or App Password session found. OAuth error: OAuth authentication failed: The session was deleted by another process. App Password error: App Password session failed: No session found for DID: did:plc:dnaonrdiuvgepft6heblocle
2026-01-20 16:09:02.817
Error: Failed to fetch user profile: Failed to get authenticated agent for BlueskyProfileService: Failed to authenticate: No valid OAuth or App Password session found. OAuth error: OAuth authentication failed: Session expired. App Password error: App Password session failed: No session found for DID: did:plc:dnaonrdiuvgepft6heblocle
2026-01-20 15:19:11.099
[AppError]: An unexpected error occurred
2026-01-20 14:09:12.990
message: 'Failed to find similar URLs: Search service error: write CONNECT_TIMEOUT pgbouncer.1zqyxr78me70wp8m.flympg.net:5432',
2026-01-20 14:08:44.635
Error: Failed to fetch user profile: Failed to get authenticated agent for BlueskyProfileService: Failed to authenticate: No valid OAuth or App Password session found. OAuth error: OAuth authentication failed: The session was deleted by another process. App Password error: App Password session failed: No session found for DID: did:plc:j3w6epaoicv72rsppeplh2y7
2026-01-20 14:08:42.965
Error: Failed to fetch user profile: Failed to get authenticated agent for BlueskyProfileService: Failed to authenticate: No valid OAuth or App Password session found. OAuth error: OAuth authentication failed: The operation was unable to achieve a quorum during its retry window.. App Password error: App Password session failed: No session found for DID: did:plc:j3w6epaoicv72rsppeplh2y7

# session getting from oauth-client-node

```ts
import { AtprotoDid } from '@atproto/did';
import { Key } from '@atproto/jwk';
import {
  CachedGetter,
  GetCachedOptions,
  SimpleStore,
} from '@atproto-labs/simple-store';
import { AuthMethodUnsatisfiableError } from './errors/auth-method-unsatisfiable-error.js';
import { TokenInvalidError } from './errors/token-invalid-error.js';
import { TokenRefreshError } from './errors/token-refresh-error.js';
import { TokenRevokedError } from './errors/token-revoked-error.js';
import { ClientAuthMethod } from './oauth-client-auth.js';
import { OAuthResponseError } from './oauth-response-error.js';
import { TokenSet } from './oauth-server-agent.js';
import { OAuthServerFactory } from './oauth-server-factory.js';
import { Runtime } from './runtime.js';
import { CustomEventTarget, combineSignals } from './util.js';

export type Session = {
  dpopKey: Key;
  /**
   * Previous implementation of this lib did not define an `authMethod`
   */
  authMethod?: ClientAuthMethod;
  tokenSet: TokenSet;
};

export type SessionStore = SimpleStore<string, Session>;

export type SessionEventMap = {
  updated: {
    sub: string;
  } & Session;
  deleted: {
    sub: string;
    cause: TokenRefreshError | TokenRevokedError | TokenInvalidError | unknown;
  };
};

export type SessionEventListener<
  T extends keyof SessionEventMap = keyof SessionEventMap,
> = (event: CustomEvent<SessionEventMap[T]>) => void;

/**
 * There are several advantages to wrapping the sessionStore in a (single)
 * CachedGetter, the main of which is that the cached getter will ensure that at
 * most one fresh call is ever being made. Another advantage, is that it
 * contains the logic for reading from the cache which, if the cache is based on
 * localStorage/indexedDB, will sync across multiple tabs (for a given sub).
 */
export class SessionGetter extends CachedGetter<AtprotoDid, Session> {
  private readonly eventTarget = new CustomEventTarget<SessionEventMap>();

  constructor(
    sessionStore: SessionStore,
    serverFactory: OAuthServerFactory,
    private readonly runtime: Runtime,
  ) {
    super(
      async (sub, options, storedSession) => {
        // There needs to be a previous session to be able to refresh. If
        // storedSession is undefined, it means that the store does not contain
        // a session for the given sub.
        if (storedSession === undefined) {
          // Because the session is not in the store, this.delStored() method
          // will not be called by the CachedGetter class (because there is
          // nothing to delete). This would typically happen if there is no
          // synchronization mechanism between instances of this class. Let's
          // make sure an event is dispatched here if this occurs.
          const msg = 'The session was deleted by another process';
          const cause = new TokenRefreshError(sub, msg);
          this.dispatchEvent('deleted', { sub, cause });
          throw cause;
        }

        // From this point forward, throwing a TokenRefreshError will result in
        // this.delStored() being called, resulting in an event being
        // dispatched, even if the session was removed from the store through a
        // concurrent access (which, normally, should not happen if a proper
        // runtime lock was provided).

        const { dpopKey, authMethod = 'legacy', tokenSet } = storedSession;

        if (sub !== tokenSet.sub) {
          // Fool-proofing (e.g. against invalid session storage)
          throw new TokenRefreshError(sub, 'Stored session sub mismatch');
        }

        if (!tokenSet.refresh_token) {
          throw new TokenRefreshError(sub, 'No refresh token available');
        }

        // Since refresh tokens can only be used once, we might run into
        // concurrency issues if multiple instances (e.g. browser tabs) are
        // trying to refresh the same token simultaneously. The chances of this
        // happening when multiple instances are started simultaneously is
        // reduced by randomizing the expiry time (see isStale() below). The
        // best solution is to use a mutex/lock to ensure that only one instance
        // is refreshing the token at a time (runtime.usingLock) but that is not
        // always possible. If no lock implementation is provided, we will use
        // the store to check if a concurrent refresh occurred.

        const server = await serverFactory.fromIssuer(
          tokenSet.iss,
          authMethod,
          dpopKey,
        );

        // Because refresh tokens can only be used once, we must not use the
        // "signal" to abort the refresh, or throw any abort error beyond this
        // point. Any thrown error beyond this point will prevent the
        // TokenGetter from obtaining, and storing, the new token set,
        // effectively rendering the currently saved session unusable.
        options?.signal?.throwIfAborted();

        try {
          const newTokenSet = await server.refresh(tokenSet);

          if (sub !== newTokenSet.sub) {
            // The server returned another sub. Was the tokenSet manipulated?
            throw new TokenRefreshError(sub, 'Token set sub mismatch');
          }

          return {
            dpopKey,
            tokenSet: newTokenSet,
            authMethod: server.authMethod,
          };
        } catch (cause) {
          // If the refresh token is invalid, let's try to recover from
          // concurrency issues, or make sure the session is deleted by throwing
          // a TokenRefreshError.
          if (
            cause instanceof OAuthResponseError &&
            cause.status === 400 &&
            cause.error === 'invalid_grant'
          ) {
            // In case there is no lock implementation in the runtime, we will
            // wait for a short time to give the other concurrent instances a
            // chance to finish their refreshing of the token. If a concurrent
            // refresh did occur, we will pretend that this one succeeded.
            if (!runtime.hasImplementationLock) {
              await new Promise((r) => setTimeout(r, 1000));

              const stored = await this.getStored(sub);
              if (stored === undefined) {
                // A concurrent refresh occurred and caused the session to be
                // deleted (for a reason we can't know at this point).

                // Using a distinct error message mainly for debugging
                // purposes. Also, throwing a TokenRefreshError to trigger
                // deletion through the deleteOnError callback.
                const msg = 'The session was deleted by another process';
                throw new TokenRefreshError(sub, msg, { cause });
              } else if (
                stored.tokenSet.access_token !== tokenSet.access_token ||
                stored.tokenSet.refresh_token !== tokenSet.refresh_token
              ) {
                // A concurrent refresh occurred. Pretend this one succeeded.
                return stored;
              } else {
                // There were no concurrent refresh. The token is (likely)
                // simply no longer valid.
              }
            }

            // Make sure the session gets deleted from the store
            const msg = cause.errorDescription ?? 'The session was revoked';
            throw new TokenRefreshError(sub, msg, { cause });
          }

          throw cause;
        }
      },
      sessionStore,
      {
        isStale: (sub, { tokenSet }) => {
          return (
            tokenSet.expires_at != null &&
            new Date(tokenSet.expires_at).getTime() <
              Date.now() +
                // Add some lee way to ensure the token is not expired when it
                // reaches the server.
                10e3 +
                // Add some randomness to reduce the chances of multiple
                // instances trying to refresh the token at the same.
                30e3 * Math.random()
          );
        },
        onStoreError: async (
          err,
          sub,
          { tokenSet, dpopKey, authMethod = 'legacy' as const },
        ) => {
          if (!(err instanceof AuthMethodUnsatisfiableError)) {
            // If the error was an AuthMethodUnsatisfiableError, there is no
            // point in trying to call `fromIssuer`.
            try {
              // If the token data cannot be stored, let's revoke it
              const server = await serverFactory.fromIssuer(
                tokenSet.iss,
                authMethod,
                dpopKey,
              );
              await server.revoke(
                tokenSet.refresh_token ?? tokenSet.access_token,
              );
            } catch {
              // Let the original error propagate
            }
          }

          throw err;
        },
        deleteOnError: async (err) =>
          err instanceof TokenRefreshError ||
          err instanceof TokenRevokedError ||
          err instanceof TokenInvalidError ||
          err instanceof AuthMethodUnsatisfiableError,
      },
    );
  }

  addEventListener<T extends keyof SessionEventMap>(
    type: T,
    callback: SessionEventListener<T>,
    options?: AddEventListenerOptions | boolean,
  ) {
    this.eventTarget.addEventListener(type, callback, options);
  }

  removeEventListener<T extends keyof SessionEventMap>(
    type: T,
    callback: SessionEventListener<T>,
    options?: EventListenerOptions | boolean,
  ) {
    this.eventTarget.removeEventListener(type, callback, options);
  }

  dispatchEvent<T extends keyof SessionEventMap>(
    type: T,
    detail: SessionEventMap[T],
  ): boolean {
    return this.eventTarget.dispatchCustomEvent(type, detail);
  }

  async setStored(sub: string, session: Session) {
    // Prevent tampering with the stored value
    if (sub !== session.tokenSet.sub) {
      throw new TypeError('Token set does not match the expected sub');
    }
    await super.setStored(sub, session);
    this.dispatchEvent('updated', { sub, ...session });
  }

  override async delStored(sub: AtprotoDid, cause?: unknown): Promise<void> {
    await super.delStored(sub, cause);
    this.dispatchEvent('deleted', { sub, cause });
  }

  /**
   * @param refresh When `true`, the credentials will be refreshed even if they
   * are not expired. When `false`, the credentials will not be refreshed even
   * if they are expired. When `undefined`, the credentials will be refreshed
   * if, and only if, they are (about to be) expired. Defaults to `undefined`.
   */
  async getSession(sub: AtprotoDid, refresh: boolean | 'auto' = 'auto') {
    return this.get(sub, {
      noCache: refresh === true,
      allowStale: refresh === false,
    });
  }

  async get(sub: AtprotoDid, options?: GetCachedOptions): Promise<Session> {
    const session = await this.runtime.usingLock(
      `@atproto-oauth-client-${sub}`,
      async () => {
        // Make sure, even if there is no signal in the options, that the
        // request will be cancelled after at most 30 seconds.
        const signal = AbortSignal.timeout(30e3);

        using abortController = combineSignals([options?.signal, signal]);

        return await super.get(sub, {
          ...options,
          signal: abortController.signal,
        });
      },
    );

    if (sub !== session.tokenSet.sub) {
      // Fool-proofing (e.g. against invalid session storage)
      throw new Error('Token set does not match the expected sub');
    }

    return session;
  }
}
```

also

```ts
protected async validateRefreshGrant(
    client: Client,
    clientAuth: ClientAuth,
    data: TokenData,
  ): Promise<void> {
    const [sessionLifetime, refreshLifetime] =
      clientAuth.method !== 'none' || client.info.isFirstParty
        ? [
            CONFIDENTIAL_CLIENT_SESSION_LIFETIME,
            CONFIDENTIAL_CLIENT_REFRESH_LIFETIME,
          ]
        : [PUBLIC_CLIENT_SESSION_LIFETIME, PUBLIC_CLIENT_REFRESH_LIFETIME]

    const sessionAge = Date.now() - data.createdAt.getTime()
    if (sessionAge > sessionLifetime) {
      throw new InvalidGrantError(`Session expired`)
    }

    const refreshAge = Date.now() - data.updatedAt.getTime()
    if (refreshAge > refreshLifetime) {
      throw new InvalidGrantError(`Refresh token expired`)
    }
  }

protected async refreshTokenGrant(
    client: Client,
    clientAuth: ClientAuth,
    clientMetadata: RequestMetadata,
    input: OAuthRefreshTokenGrantTokenRequest,
    dpopProof: null | DpopProof,
  ): Promise<OAuthTokenResponse> {
    const refreshToken = await refreshTokenSchema
      .parseAsync(input.refresh_token, { path: ['refresh_token'] })
      .catch((err) => {
        const msg = formatError(err, 'Invalid refresh token')
        throw new InvalidGrantError(msg, err)
      })

    const tokenInfo = await this.tokenManager.consumeRefreshToken(refreshToken)

    try {
      const { data } = tokenInfo
      await this.compareClientAuth(client, clientAuth, dpopProof, data)
      await this.validateRefreshGrant(client, clientAuth, data)

      return await this.tokenManager.rotateToken(
        client,
        clientAuth,
        clientMetadata,
        tokenInfo,
      )
    } catch (err) {
      await this.tokenManager.deleteToken(tokenInfo.id)

      throw err
    }
  }

public async token(
    clientCredentials: OAuthClientCredentials,
    clientMetadata: RequestMetadata,
    request: OAuthTokenRequest,
    dpopProof: null | DpopProof,
  ): Promise<OAuthTokenResponse> {
    const { client, clientAuth } = await this.authenticateClient(
      clientCredentials,
      dpopProof,
    )

    if (!this.metadata.grant_types_supported?.includes(request.grant_type)) {
      throw new InvalidGrantError(
        `Grant type "${request.grant_type}" is not supported by the server`,
      )
    }

    if (!client.metadata.grant_types.includes(request.grant_type)) {
      throw new InvalidGrantError(
        `"${request.grant_type}" grant type is not allowed for this client`,
      )
    }

    if (request.grant_type === 'authorization_code') {
      return this.authorizationCodeGrant(
        client,
        clientAuth,
        clientMetadata,
        request,
        dpopProof,
      )
    }

    if (request.grant_type === 'refresh_token') {
      return this.refreshTokenGrant(
        client,
        clientAuth,
        clientMetadata,
        request,
        dpopProof,
      )
    }

    throw new InvalidGrantError(
      `Grant type "${request.grant_type}" not supported`,
    )
  }
```
