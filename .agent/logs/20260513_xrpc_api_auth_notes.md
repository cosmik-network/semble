# Semble Auth Architecture: Full Summary

---

## Your Situation, Clearly Stated

```
semble.so (browser)  ──cookie──►  api.semble.so  ──DPoP+OAuth──►  User's PDS
```

- Your **main app** uses cookies between browser and backend — this is the BFF pattern, correct and secure
- Your **backend** holds the PDS session and proxies all atproto calls
- Your **endpoints are ad-hoc HTTP** — no Lexicon schemas, no standard auth for outsiders
- You want to open this up to 3rd party developers without forcing them to deal with atproto internals

---

## Option C: The Approach You've Chosen

**Lock CORS to known origins for cookie auth. Everyone else uses `Authorization` header.**

```typescript
const ALLOWED_ORIGINS = ['https://semble.so'];

app.use('/xrpc', (req, res, next) => {
  const origin = req.headers['origin'];

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    // Main app: allow cookies, lock to exact origin
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    // Everyone else: open CORS, no credentials mode
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-API-Key',
  );
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
```

This is clean because:

- **Nothing changes** for your main app — cookies keep working exactly as today
- **3rd party browser apps** can call your XRPC endpoints from any origin using an `Authorization` header — CORS is `*` for non-credentialed requests
- **CLI tools, bots, server-side code** — no CORS involved at all, just use the header

---

## The Three Auth Paths on api.semble.so

There are actually **three** ways a caller can authenticate, not two. Here's the full picture:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    api.semble.so /xrpc/* endpoints                   │
│                                                                      │
│  Auth middleware (checked in order):                                 │
│                                                                      │
│  1. 🍪 Cookie          → semble.so main app (CORS locked)           │
│  2. 🔑 API Key         → any 3rd party (simple, CORS open)          │
│  3. 🪪 Service JWT     → atproto-native 3rd party apps (CORS open)  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Path 1: Cookie (Main App)

Already working. No changes needed. CORS locked to `semble.so`.

### Path 2: API Key (3rd Party — Simple)

User creates a key in the Semble UI. Developer puts it in the header. Done.

```bash
curl https://api.semble.so/xrpc/so.semble.getEntries \
  -H "Authorization: Bearer sk_live_abc123..."
```

Your backend looks up the key → finds the user → uses the stored PDS session to proxy.

### Path 3: Service Auth JWT (3rd Party — atproto-native) ← The New One

This is the atproto-idiomatic way for a 3rd party app that has **already done atproto OAuth** to call your backend — without needing an API key at all.

---

## How Service Auth JWT Works for 3rd Parties

First, a critical clarification: **api.semble.so cannot directly accept or validate atproto OAuth access tokens.** Those tokens are DPoP-bound to the PDS URL and are only valid as credentials to the PDS (the Resource Server in atproto OAuth). [^2] [^2]

Instead, the mechanism is **service auth JWTs** — short-lived tokens the PDS issues on behalf of the user, specifically scoped to call your service. [^1] [^1]

### The Flow

```
3rd Party App          User's PDS              api.semble.so
      │                    │                         │
      │  1. atproto OAuth  │                         │
      │  (PKCE+PAR+DPoP)   │                         │
      │──────────────────>│                         │
      │<── access_token ──│                         │
      │    (DPoP-bound)    │                         │
      │                    │                         │
      │  2. GET /xrpc/com.atproto.server.getServiceAuth
      │  Authorization: DPoP {access_token}          │
      │  DPoP: {proof}     │                         │
      │  ?aud=did:web:api.semble.so%23semble_service │
      │  &lxm=so.semble.getEntries                   │
      │──────────────────>│                         │
      │<── { token: "eyJ..." } (service JWT, ~60s)   │
      │                    │                         │
      │  3. Call your XRPC endpoint                  │
      │  GET /xrpc/so.semble.getEntries              │
      │  Authorization: Bearer {serviceJwt} ────────>│
      │                    │                         │
      │                    │  4. Validate JWT:        │
      │                    │  - fetch user DID doc    │
      │                    │  - verify signature      │
      │                    │  - check aud, lxm, exp   │
      │                    │                         │
      │<── response ───────────────────────────────>│
```

[^1] [^1] [^1]

### What the Service JWT Contains

```json
// Header
{ "alg": "ES256", "kid": "did:plc:user123#atproto" }

// Payload
{
  "iss": "did:plc:user123abc",                          // user's DID
  "aud": "did:web:api.semble.so#semble_service",        // your service
  "lxm": "so.semble.getEntries",                        // specific method
  "exp": 1700000060,                                    // ~60s from now
  "iat": 1700000000,
  "jti": "random-nonce-abc123"                          // replay prevention
}
```

The `lxm` field locks the JWT to **one specific XRPC method** — a JWT for `so.semble.getEntries` cannot be used to call `so.semble.deleteEntry`. [^1] [^1]

### Validating Service JWTs on api.semble.so

```typescript
import { verifyJwt } from '@atproto/xrpc-server';

async function validateServiceJwt(token: string, requestedMethod: string) {
  // The SDK handles: fetch DID doc, verify signature, check expiry
  const payload = await verifyJwt(token, null, requestedMethod, async (did) => {
    // Fetch the user's DID document to get their signing key
    const didDoc = await resolveDid(did);
    return getSigningKey(didDoc);
  });

  // payload.iss = user's DID
  // payload.aud = must match your service DID
  // payload.lxm = must match the XRPC method being called
  if (payload.aud !== 'did:web:api.semble.so#semble_service') {
    throw new Error('Wrong audience');
  }

  return { userDid: payload.iss };
}
```

### OAuth Scopes for rpc Calls

When the 3rd party app does its initial atproto OAuth, it must request the right scope to be allowed to call `getServiceAuth` for your endpoints. The scope string syntax is: [^1] [^1] [^1]

```
rpc:so.semble.getEntries?aud=did:web:api.semble.so%23semble_service
```

Or using `transition:generic` which already includes the ability to generate service auth tokens for any endpoint. [^2]

---

## Full Auth Middleware (All Three Paths)

```typescript
async function authenticate(
  req: Request,
): Promise<{ userDid: string; userId: string }> {
  const method = req.path.replace('/xrpc/', ''); // e.g. "so.semble.getEntries"

  // ── Path 1: Cookie (main app, semble.so) ──────────────────────────
  const sessionId = req.cookies['semble_session'];
  if (sessionId) {
    const session = await sessions.getBySessionId(sessionId);
    if (!session) throw new AuthError('Invalid session');
    return { userDid: session.userDid, userId: session.userId };
  }

  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token) throw new AuthError('Authentication required');

  // ── Path 2: API Key ───────────────────────────────────────────────
  if (token.startsWith('sk_')) {
    const key = await apiKeys.lookup(token);
    if (!key || key.revokedAt)
      throw new AuthError('Invalid or revoked API key');
    if (key.expiresAt && key.expiresAt < new Date())
      throw new AuthError('API key expired');
    if (key.scopes?.length && !key.scopes.includes(method)) {
      throw new AuthError(`API key not scoped for ${method}`);
    }
    await apiKeys.recordUsage(key.id);
    return { userDid: key.userDid, userId: key.userId };
  }

  // ── Path 3: Service Auth JWT (atproto-native 3rd party) ───────────
  try {
    const payload = await validateServiceJwt(token, method);
    // Look up the user in our DB by their DID
    const user = await users.getByDid(payload.userDid);
    if (!user)
      throw new AuthError('User not found — have they connected Semble?');
    return { userDid: payload.userDid, userId: user.id };
  } catch (e) {
    throw new AuthError('Invalid token');
  }
}
```

---

## Important Note on Path 3

For the service JWT path to work, **the user must have already connected their account to Semble** (i.e. logged into semble.so at least once). Your backend needs a stored PDS session for that user to proxy calls on their behalf. The service JWT proves _who_ the user is, but your backend still needs its own PDS session to act on their behalf.

If the user has never used Semble, the service JWT will validate fine but you'll have no PDS session to proxy with — you'd need to handle this gracefully (e.g. return a `401` with a message like `"Connect your account at semble.so first"`).

---

## Complete Picture

| Auth Method    | Who uses it                   | CORS                  | How api.semble.so proxies to PDS      |
| -------------- | ----------------------------- | --------------------- | ------------------------------------- |
| 🍪 Cookie      | semble.so browser app         | Locked to `semble.so` | Uses stored PDS session for that user |
| 🔑 API Key     | Any 3rd party                 | `*` (open)            | Uses stored PDS session for that user |
| 🪪 Service JWT | atproto-native 3rd party apps | `*` (open)            | Uses stored PDS session for that user |

In all three cases, **your backend is the one holding and using the PDS session**. The auth method only determines _how the caller proves who they are_ to your backend. The PDS proxying layer is identical regardless. This is the cleanest possible design — one proxy layer, three auth entry points.

[^1]: [Permissions - AT Protocol](https://atproto.com/specs/permission) (57%)

[^2]: [OAuth - AT Protocol](https://atproto.com/specs/oauth) (43%)
