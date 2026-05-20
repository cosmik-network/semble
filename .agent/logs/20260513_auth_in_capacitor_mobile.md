# Yes — Use Auth Header Instead of Cookies for Mobile

Short answer: **absolutely yes**, and this is actually the right call regardless of the mobile use case. Cookies in Capacitor are a well-documented pain point.

---

## Why Cookies Are Problematic in Capacitor

Capacitor runs your app inside a **WKWebView** (iOS) or **WebView** (Android) — not a real browser. These have meaningfully different cookie behaviour: [^1]

| Issue                                     | Detail                                                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **iOS WKWebView isolation**               | Uses a completely separate cookie jar from Safari. Cookies often don't persist across app restarts. [^1]        |
| **Android inconsistency**                 | Cookie behaviour varies by OS version and WebView implementation [^5]                                           |
| **SameSite policy**                       | Cross-origin cookies (e.g. `semble.so` app calling `api.semble.so`) get treated as third-party and blocked [^3] |
| **ITP (Intelligent Tracking Prevention)** | iOS aggressively purges cookies it considers cross-site [^2]                                                    |
| **No guarantee of persistence**           | Cookies are not guaranteed to survive between app sessions in Capacitor [^4]                                    |

The Ionic community consensus is clear: **don't rely on cookies for auth in Capacitor apps — use Bearer tokens instead.** [^2] [^4]

---

## The Revised Unified Architecture

This actually simplifies things. Instead of cookies being a special case for `semble.so`, **all clients use `Authorization: Bearer`**. The only difference is _what kind of token_ they present:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    api.semble.so /xrpc/* endpoints                   │
│              Access-Control-Allow-Origin: *                          │
│                                                                      │
│  Auth middleware (checked in order):                                 │
│                                                                      │
│  1. 🔐 Session Token   → semble.so web + mobile (PWA/Capacitor)     │
│  2. 🔑 API Key         → any 3rd party (simple)                     │
│  3. 🪪 Service JWT     → atproto-native 3rd party apps              │
│                                                                      │
│  All via:  Authorization: Bearer {token}                             │
└──────────────────────────────────────────────────────────────────────┘
```

No cookies anywhere in the XRPC layer. CORS is `*` across the board. Clean.

---

## What Changes for semble.so

Your main app now has **two layers**:

### Layer 1: Login (still uses cookies, server-side only)

The login flow itself can still use a cookie-based session on the server — but the browser/app never relies on the cookie being sent automatically. Instead, after login, the server returns a **session token** in the response body:

```typescript
// POST /auth/login
app.post('/auth/login', async (req, res) => {
  // ... validate atproto OAuth callback, store PDS session ...

  const sessionToken = await tokens.issue({
    userId: user.id,
    userDid: user.did,
    type: 'session',
    expiresIn: '7d',
  });

  // Return token in body — client stores it explicitly
  res.json({ token: sessionToken });

  // Optionally ALSO set a cookie for web (belt-and-suspenders)
  // res.cookie('semble_session', sessionToken, { httpOnly: true, sameSite: 'strict' })
});
```

### Layer 2: All XRPC calls use the token explicitly

```typescript
// Client-side (works identically in browser, PWA, and Capacitor)
const token = await storage.get('semble_token'); // localStorage, Capacitor Preferences, etc.

const response = await fetch(
  'https://api.semble.so/xrpc/so.semble.getEntries',
  {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  },
);
```

No `credentials: 'include'`, no cookie juggling, no platform-specific workarounds.

---

## Token Storage in Capacitor

Since you're not relying on cookies, store the session token in **Capacitor Preferences** (secure, persistent, works across app restarts): [^1]

```typescript
import { Preferences } from '@capacitor/preferences';

// Store after login
await Preferences.set({ key: 'semble_token', value: sessionToken });

// Retrieve for API calls
const { value: token } = await Preferences.get({ key: 'semble_token' });

// Clear on logout
await Preferences.remove({ key: 'semble_token' });
```

For extra security on mobile, use `@capacitor-community/secure-storage` which uses the iOS Keychain / Android Keystore under the hood. [^1]

---

## Updated Auth Middleware (No Cookie Path Needed)

```typescript
async function authenticate(req: Request) {
  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) throw new AuthError('Authentication required');

  // ── Path 1: Session token (semble.so web + mobile) ───────────────
  if (token.startsWith('sbl_sess_')) {
    const session = await sessions.getByToken(token);
    if (!session || session.revokedAt) throw new AuthError('Invalid session');
    if (session.expiresAt < new Date()) throw new AuthError('Session expired');
    return { userDid: session.userDid, userId: session.userId };
  }

  // ── Path 2: API key (3rd party) ───────────────────────────────────
  if (token.startsWith('sk_')) {
    const key = await apiKeys.lookup(token);
    if (!key || key.revokedAt)
      throw new AuthError('Invalid or revoked API key');
    return { userDid: key.userDid, userId: key.userId };
  }

  // ── Path 3: Service auth JWT (atproto-native) ─────────────────────
  try {
    const payload = await validateServiceJwt(token, req.xrpcMethod);
    const user = await users.getByDid(payload.iss);
    if (!user)
      throw new AuthError('User not found — connect at semble.so first');
    return { userDid: payload.iss, userId: user.id };
  } catch {
    throw new AuthError('Invalid token');
  }
}
```

No cookie path at all. CORS is simply:

```typescript
app.use('/xrpc', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
```

---

## Final Architecture Summary

| Client                      | Auth Method               | Token Storage                      | CORS             |
| --------------------------- | ------------------------- | ---------------------------------- | ---------------- |
| `semble.so` browser         | `Bearer sbl_sess_...`     | `localStorage`                     | `*`              |
| Capacitor PWA (iOS/Android) | `Bearer sbl_sess_...`     | `Capacitor Preferences` / Keychain | `*`              |
| 3rd party CLI / server      | `Bearer sk_...` (API key) | Env var / secrets manager          | N/A (no browser) |
| 3rd party browser app       | `Bearer sk_...` (API key) | `localStorage`                     | `*`              |
| atproto-native app          | `Bearer {serviceJwt}`     | Ephemeral (60s)                    | `*`              |

**The cookie question resolves itself** — by dropping cookies from the XRPC layer entirely, you get a simpler, more uniform architecture that works identically across web, PWA, and Capacitor without any platform-specific workarounds. The session token is just a string your client stores and sends — nothing magic about it.

[^1]: [Understanding Authentication in Hybrid Mobile Apps: Cookies, WebViews, and Common Pitfalls - DEV Community](https://dev.to/itamartati/understanding-authentication-in-hybrid-mobile-apps-cookies-webviews-and-common-pitfalls-3m8) (50%)

[^2]: [Capacitor iOS / Cookie Authentication / capacitor/http - Ionic Forum](https://forum.ionicframework.com/t/capacitor-ios-cookie-authentication-capacitor-http/237748) (20%)

[^3]: [cookies blocked using auth0 · ionic-team capacitor · Discussion #3171](https://github.com/ionic-team/capacitor/discussions/3171) (12%)

[^4]: [Server set cookies not working on Capacitor iOS... - Ionic Forum](https://forum.ionicframework.com/t/server-set-cookies-not-working-on-capacitor-ios/224688) (10%)

[^5]: [CORS/Cookies on Android under Capacitor 4.x #6438 - GitHub](https://github.com/ionic-team/capacitor/discussions/6438) (8%)
