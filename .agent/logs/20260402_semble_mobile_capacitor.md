# Semble Mobile App with Capacitor - Complete Implementation Guide

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [File Structure & Relevant Paths](#file-structure--relevant-paths)
3. [OAuth Flow - Web vs Mobile](#oauth-flow---web-vs-mobile)
4. [Authentication Token Management](#authentication-token-management)
5. [Implementation Status](#implementation-status)
6. [Next Steps](#next-steps)

---

## Executive Summary

Semble is a Progressive Web App (PWA) built with Next.js that's being wrapped with Capacitor to create native iOS and Android apps. The application uses ATProto OAuth for authentication with Bluesky accounts.

### Key Platform Differences

| Aspect                 | Web                              | Mobile (Capacitor)                                |
| ---------------------- | -------------------------------- | ------------------------------------------------- |
| **OAuth Redirect**     | Browser redirect to callback URL | Deep link to `so.semble://oauth-callback`         |
| **Browser**            | Same window navigation           | In-app browser (`@capacitor/browser`)             |
| **Token Storage**      | httpOnly cookies                 | Needs native secure storage (not yet implemented) |
| **Platform Detection** | N/A                              | Uses `@capacitor/core` to detect native platform  |
| **App ID**             | N/A                              | `so.semble`                                       |

### Current Mobile Configuration

- **App ID:** `so.semble`
- **Deep Link Scheme:** `so.semble://`
- **Development Server:** `http://127.0.0.1:4000`
- **Production Server:** `https://semble.so` (needs configuration)

---

## File Structure & Relevant Paths

### Frontend Files (Mobile-Specific)

#### Capacitor Configuration

- `src/webapp/capacitor.config.ts` - Main Capacitor configuration
- `src/webapp/android/app/src/main/AndroidManifest.xml` - Android deep link configuration
- `src/webapp/ios/App/App/Info.plist` - iOS URL scheme configuration

#### OAuth & Authentication Components

- `src/webapp/features/auth/components/loginForm/LoginForm.tsx` - Main login form with platform detection
- `src/webapp/features/auth/components/loginForm/OAuthLoginForm.tsx` - OAuth-specific login UI
- `src/webapp/lib/auth/oauthDeepLinkHandler.ts` - **Mobile-only:** Handles OAuth deep link callbacks
- `src/webapp/lib/capacitor/platform.ts` - Platform detection utilities

#### API Client

- `src/webapp/api-client/clients/UserClient.ts` - User authentication API client
- `src/webapp/api-client/clients/BaseClient.ts` - Base HTTP client (needs modification for mobile tokens)

#### Authentication Hooks & Services

- `src/webapp/hooks/useAuth.tsx` - Main auth hook
- `src/webapp/services/auth/CookieAuthService.client.ts` - Client-side cookie service
- `src/webapp/services/auth/CookieAuthService.server.ts` - Server-side cookie service
- `src/webapp/services/client.apiClient.ts` - API client factory

#### Providers

- `src/webapp/providers/index.tsx` - Initializes OAuth deep link handler for mobile

### Backend Files

#### OAuth Controllers

- `src/modules/user/infrastructure/http/controllers/InitiateOAuthSignInController.ts` - Starts OAuth flow
- `src/modules/user/infrastructure/http/controllers/CompleteOAuthSignInController.ts` - Completes OAuth, sets cookies/returns tokens

#### OAuth Use Cases

- `src/modules/user/application/use-cases/InitiateOAuthSignInUseCase.ts` - Business logic for OAuth initiation
- `src/modules/user/application/use-cases/CompleteOAuthSignInUseCase.ts` - Business logic for OAuth completion

#### OAuth Services & Infrastructure

- `src/modules/user/infrastructure/services/OAuthClientFactory.ts` - **Key file:** Creates platform-specific OAuth clients
- `src/modules/atproto/infrastructure/services/AtProtoOAuthProcessor.ts` - ATProto OAuth implementation
- `src/shared/infrastructure/http/factories/ServiceFactory.ts` - Service initialization (accepts platform parameter)
- `src/shared/infrastructure/http/services/CookieService.ts` - Cookie management for web

#### Type Definitions

- `src/types/src/api/requests.ts` - API request types (includes `client` field for platform detection)
- `src/types/src/api/responses.ts` - API response types
- `src/types/src/api/internal.ts` - Internal types (TokenPair)

---

## OAuth Flow - Web vs Mobile

### Web OAuth Flow (Production)

```
┌──────────┐                    ┌──────────────┐                    ┌──────────────┐
│          │  1. GET /api/users │              │  2. Generate        │              │
│  Browser │    /login?handle=  │   Backend    │     auth URL        │  Bluesky PDS │
│          │ ─────────────────> │              │ ──────────────────> │              │
│          │                    │              │                    │              │
│          │  3. authUrl         │              │                    │              │
│          │ <───────────────── │              │                    │              │
│          │                    │              │                    │              │
│          │  4. window.location.href = authUrl                     │              │
│          │ ───────────────────────────────────────────────────────>│              │
│          │                    │              │                    │              │
│          │  5. User authorizes                                    │              │
│          │                    │              │                    │              │
│          │  6. Redirect to     │              │  7. GET /api/users │              │
│          │     callback URL    │              │     /oauth/callback│              │
│          │ <─────────────────── │              │ <───────────────── │              │
│          │                    │              │    ?code=&state=   │              │
│          │                    │              │                    │              │
│          │  8. Set httpOnly    │              │  9. Exchange code  │              │
│          │     cookies +       │              │     for tokens     │              │
│          │     redirect /home  │              │ ──────────────────> │              │
│          │ <─────────────────── │              │ <───────────────── │              │
└──────────┘                    └──────────────┘                    └──────────────┘

OAuth Client Configuration (Production):
- client_id: https://semble.so/atproto/oauth-client-metadata.json
- redirect_uri: https://semble.so/api/users/oauth/callback
- application_type: web
```

### Mobile OAuth Flow (Production)

```
┌──────────┐                    ┌──────────────┐                    ┌──────────────┐
│   Mobile │  1. GET /api/users │              │  2. Generate        │              │
│    App   │ /login?handle=     │   Backend    │     auth URL        │  Bluesky PDS │
│          │ &client=native     │              │ ──────────────────> │              │
│          │ ─────────────────> │              │                    │              │
│          │                    │              │                    │              │
│          │  3. authUrl         │              │                    │              │
│          │ <───────────────── │              │                    │              │
│          │                    │              │                    │              │
│          │  4. Browser.open({url: authUrl})                       │              │
│          │ ────────────────────────────────────────────────────────>              │
│          │       (Opens in-app browser)      │                    │              │
│          │                    │              │                    │              │
│          │  5. User authorizes in browser     │                    │              │
│          │                    │              │                    │              │
│          │  6. Deep link:      │              │                    │              │
│          │  so.semble://       │              │                    │              │
│          │  oauth-callback     │              │                    │              │
│          │ <─────────────────── │              │                    │              │
│          │  ?code=&state=&iss= │              │                    │              │
│          │                    │              │                    │              │
│          │  7. App.addListener │              │                    │              │
│          │    catches deep link│              │                    │              │
│          │                    │              │                    │              │
│          │  8. Browser.close() │              │                    │              │
│          │                    │              │                    │              │
│          │  9. GET /api/users  │              │ 10. Exchange code  │              │
│          │     /oauth/callback │              │     for tokens     │              │
│          │     ?client=native  │              │ ──────────────────> │              │
│          │ ─────────────────> │              │ <───────────────── │              │
│          │                    │              │                    │              │
│          │ 11. JSON response   │              │                    │              │
│          │     (not redirect)  │              │                    │              │
│          │ <─────────────────── │              │                    │              │
│          │                    │              │                    │              │
│          │ 12. Store tokens    │              │                    │              │
│          │     (TODO: secure   │              │                    │              │
│          │      storage)       │              │                    │              │
│          │                    │              │                    │              │
│          │ 13. Router.push     │              │                    │              │
│          │     ('/home')       │              │                    │              │
└──────────┘                    └──────────────┘                    └──────────────┘

OAuth Client Configuration (Production):
- client_id: https://semble.so/atproto/oauth-client-metadata.json
- redirect_uri: so.semble://oauth-callback
- application_type: native
```

### Local Development OAuth Flow

For local development, ATProto OAuth supports a special `localhost` exception:

```
OAuth Client Configuration (Local Development):
- client_id: http://localhost?redirect_uri=<encoded_uri>&scope=<encoded_scope>
- Web redirect_uri: http://127.0.0.1:3000/api/users/oauth/callback
- Mobile redirect_uri: so.semble://oauth-callback
- application_type: web (for web) / native (for mobile)
```

This allows development without publishing client metadata.

---

## Authentication Token Management

### Current Web Implementation (Cookie-Based)

**File:** `src/shared/infrastructure/http/services/CookieService.ts`

```typescript
// Cookie configuration for web
setTokens(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  const cookieOptions = {
    httpOnly: true,        // Prevents XSS attacks
    secure: isProd,        // HTTPS only in production
    sameSite: 'lax',      // CSRF protection
    domain: '.semble.so', // Production domain
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  };

  res.cookie('accessToken', tokens.accessToken, cookieOptions);
  res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
}
```

**Web Token Flow:**

1. Login sets httpOnly cookies on backend
2. Browser automatically includes cookies with `credentials: 'include'`
3. Backend validates cookies on each request
4. Auto-refresh handled by `/api/auth/me` endpoint

### Mobile Token Management Issues

**Problem:** httpOnly cookies don't persist reliably in Capacitor WebViews

```
┌─────────────────────────────────────────────┐
│          iOS Cookie Persistence              │
├─────────────────────────────────────────────┤
│ App Launch → Cookies exist ✓                 │
│ API calls work ✓                             │
│ App goes to background...                    │
│ App terminated by OS...                      │
│ User relaunches app → Cookies lost ✗         │
│ User must login again ✗                      │
└─────────────────────────────────────────────┘
```

### Recommended Mobile Token Storage Solution

**Use Native Secure Storage (not yet implemented):**

```typescript
// Proposed NativeTokenService.ts
import { SecureStorage } from '@capacitor-community/secure-storage';

class NativeTokenService {
  async storeTokens(tokens: { accessToken: string; refreshToken: string }) {
    // Store in iOS Keychain / Android Keystore
    await SecureStorage.set({ key: 'accessToken', value: tokens.accessToken });
    await SecureStorage.set({
      key: 'refreshToken',
      value: tokens.refreshToken,
    });
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const { value } = await SecureStorage.get({ key: 'accessToken' });
      return value;
    } catch {
      return null;
    }
  }
}
```

**Modified API Client for Mobile:**

```typescript
// BaseClient.ts modification needed
async request(method: string, endpoint: string, data?: any) {
  const headers: any = { 'Content-Type': 'application/json' };

  if (isNativePlatform()) {
    // Mobile: Add token to Authorization header
    const token = await NativeTokenService.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Web: Use credentials: 'include' for cookies
  const options = {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: isNativePlatform() ? 'omit' : 'include'
  };

  return fetch(endpoint, options);
}
```

### Platform-Specific Token Storage Comparison

| Platform                  | Storage Method   | Security           | Persistence        | Access      |
| ------------------------- | ---------------- | ------------------ | ------------------ | ----------- |
| **Web**                   | httpOnly Cookies | ✅ XSS-proof       | ✅ Excellent       | Server-only |
| **iOS (Current)**         | httpOnly Cookies | ⚠️ Variable        | ❌ Lost on restart | Server-only |
| **iOS (Recommended)**     | Keychain         | ✅ Hardware-backed | ✅ Excellent       | Native API  |
| **Android (Current)**     | httpOnly Cookies | ⚠️ Variable        | ⚠️ Usually works   | Server-only |
| **Android (Recommended)** | Keystore         | ✅ Hardware-backed | ✅ Excellent       | Native API  |

---

## Implementation Status

### ✅ Completed

#### Deep Link Configuration

- **Android:** Intent filter added to `AndroidManifest.xml` for `so.semble://oauth-callback`
- **iOS:** URL scheme `so.semble` added to `Info.plist`

#### OAuth Client Factory

- `OAuthClientFactory.ts` now accepts `isNativePlatform` parameter
- Returns platform-specific configuration:
  - Native: `redirect_uri: so.semble://oauth-callback`, `application_type: native`
  - Web: `redirect_uri: https://semble.so/api/users/oauth/callback`, `application_type: web`

#### OAuth Flow

- Frontend detects platform and uses in-app browser for mobile
- Deep link handler (`oauthDeepLinkHandler.ts`) catches OAuth callback
- Backend supports `client=native` parameter for mobile-specific responses

#### Type Definitions

- Updated `InitiateOAuthSignInRequest` and `CompleteOAuthSignInRequest` to include optional `client` field

### ❌ Not Yet Implemented

#### Token Storage for Mobile

1. **Secure Storage Plugin:** Need to install `@capacitor-community/secure-storage`
2. **Token Service:** Need to create `NativeTokenService.ts` for secure storage operations
3. **API Client Updates:** `BaseClient.ts` needs to read tokens from secure storage on mobile
4. **Backend Response:** `CompleteOAuthSignInController` needs to return tokens in response body for native clients (currently only returns success message)
5. **Token Refresh:** Mobile-specific refresh logic (can't rely on cookie-based refresh)
6. **Logout:** Clear tokens from secure storage on mobile logout

#### Production Configuration

1. **Server URL:** Update `capacitor.config.ts` from `http://127.0.0.1:4000` to `https://semble.so`
2. **Cleartext:** Disable `cleartext: true` in production
3. **OAuth Metadata:** Ensure OAuth client metadata is properly hosted

---

## Next Steps

### Priority 1: Enable Mobile Token Persistence (Required for Launch)

1. **Install Secure Storage Plugin:**

   ```bash
   npm install @capacitor-community/secure-storage
   npx cap sync
   ```

2. **Create Token Service:**
   - Create `src/webapp/services/auth/NativeTokenService.ts`
   - Create `src/webapp/services/auth/TokenService.ts` (platform-aware facade)

3. **Update Backend:**

   ```typescript
   // CompleteOAuthSignInController.ts line 48-52
   if (client === 'native') {
     return this.ok(res, {
       message: 'OAuth sign-in completed successfully',
       accessToken: result.value.accessToken, // ADD THIS
       refreshToken: result.value.refreshToken, // ADD THIS
     });
   }
   ```

4. **Update Deep Link Handler:**

   ```typescript
   // oauthDeepLinkHandler.ts after line 98
   const response = await client.completeOAuthSignIn({...});

   // Store tokens in secure storage
   if (response.accessToken && response.refreshToken) {
     await NativeTokenService.storeTokens({
       accessToken: response.accessToken,
       refreshToken: response.refreshToken
     });
   }
   ```

5. **Update API Client:**
   - Modify `BaseClient.ts` to add Authorization header on mobile
   - Keep `credentials: 'include'` for web

### Priority 2: Production Configuration

1. Update `capacitor.config.ts`:

   ```typescript
   server: {
     url: process.env.NODE_ENV === 'production'
       ? 'https://semble.so'
       : 'http://127.0.0.1:4000',
     cleartext: process.env.NODE_ENV !== 'production'
   }
   ```

2. Test OAuth flow in production environment

### Priority 3: Enhanced Security & UX

1. Implement token refresh for mobile
2. Add biometric authentication option
3. Implement secure token rotation
4. Add offline support considerations

---

## Testing Checklist

### Web Platform

- [ ] OAuth login works with cookies
- [ ] Tokens persist across browser sessions
- [ ] Auto-refresh works when token expires
- [ ] Logout clears cookies

### Mobile Platform (iOS)

- [ ] Deep link opens app from OAuth callback
- [ ] Tokens stored in Keychain
- [ ] Tokens persist after app restart
- [ ] API calls include Authorization header
- [ ] Logout clears Keychain

### Mobile Platform (Android)

- [ ] Deep link opens app from OAuth callback
- [ ] Tokens stored in Keystore
- [ ] Tokens persist after app restart
- [ ] API calls include Authorization header
- [ ] Logout clears Keystore

---

## Additional Resources

- [ATProto OAuth Specification](https://atproto.com/specs/oauth)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor Secure Storage Plugin](https://github.com/capacitor-community/secure-storage)
- [iOS Keychain Services](https://developer.apple.com/documentation/security/keychain_services)
- [Android Keystore](https://developer.android.com/training/articles/keystore)
