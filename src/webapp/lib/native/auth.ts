import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { createApiClient } from '@/api-client/ApiClient';
import { ENABLE_AUTH_LOGGING } from '@/lib/auth/constants';
import { isNativeApp, NATIVE_AUTH_DEEP_LINK_HOST } from './platform';
import {
  clearTokens,
  getRefreshTokenSync,
  hydrateTokenStore,
  setTokens,
} from './tokenStore';

/**
 * Native (Capacitor) auth flow.
 *
 * OAuth's redirect_uri is fixed to the backend, so the native app can't
 * complete OAuth itself. Instead:
 *   1. Open the system browser at initiateOAuth?...&client=native.
 *   2. Provider -> backend callback -> deep link `com.semble.app://auth?code=...`.
 *   3. The appUrlOpen listener catches the code, exchanges it for a TokenPair,
 *      stores it, and routes into the app.
 *
 * Tokens never appear in a redirect URL — only the single-use opaque code does.
 */

type OnAuthenticated = () => void | Promise<void>;

/** Begin native OAuth: open the system browser at the initiate URL. */
export async function startNativeOAuth(handle: string): Promise<void> {
  const client = createApiClient();
  const { authUrl } = await client.initiateOAuthSignIn({
    handle,
    client: 'native',
  });
  await Browser.open({ url: authUrl });
}

/**
 * Register the deep-link handler that completes native sign-in. Returns a
 * cleanup function. Safe to call in browser mode (no-op).
 */
export function registerNativeAuthDeepLinkHandler(
  onAuthenticated: OnAuthenticated,
): () => void {
  if (!isNativeApp()) return () => {};

  const handlePromise = App.addListener(
    'appUrlOpen',
    async (event: URLOpenListenerEvent) => {
      let url: URL;
      try {
        url = new URL(event.url);
      } catch {
        return;
      }

      // Only handle our auth deep link: com.semble.app://auth?code=...
      if (url.host !== NATIVE_AUTH_DEEP_LINK_HOST) return;

      // Close the system browser now that we're back in the app.
      Browser.close().catch(() => {});

      const error = url.searchParams.get('error');
      if (error) {
        if (ENABLE_AUTH_LOGGING) {
          console.error('[nativeAuth] OAuth error from deep link:', error);
        }
        return;
      }

      const code = url.searchParams.get('code');
      if (!code) return;

      try {
        const client = createApiClient();
        const tokens = await client.exchangeAuthCode({ code });
        await setTokens({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
        if (ENABLE_AUTH_LOGGING) {
          console.log('[nativeAuth] Exchanged code for tokens, signed in');
        }
        await onAuthenticated();
      } catch (err) {
        if (ENABLE_AUTH_LOGGING) {
          console.error('[nativeAuth] Failed to exchange auth code:', err);
        }
      }
    },
  );

  return () => {
    handlePromise.then((handle) => handle.remove()).catch(() => {});
  };
}

/**
 * Refresh the native session. The browser build refreshes via the cookie-based
 * /api/auth/me proxy; the native build has no cookie, so it calls the backend
 * refresh endpoint directly with the stored refresh token and re-stores the pair.
 * Returns true on success.
 */
export async function refreshNativeSession(): Promise<boolean> {
  const refreshToken = getRefreshTokenSync();
  if (!refreshToken) return false;
  try {
    const client = createApiClient();
    const tokens = await client.refreshAccessToken({ refreshToken });
    await setTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    return true;
  } catch (err) {
    if (ENABLE_AUTH_LOGGING) {
      console.error('[nativeAuth] Refresh failed:', err);
    }
    return false;
  }
}

/** Log out the native session: revoke the refresh token and clear local storage. */
export async function logoutNativeSession(): Promise<void> {
  const refreshToken = getRefreshTokenSync();
  try {
    if (refreshToken) {
      const client = createApiClient();
      await client.logout();
    }
  } catch (err) {
    if (ENABLE_AUTH_LOGGING) {
      console.error('[nativeAuth] Logout revoke failed:', err);
    }
  } finally {
    await clearTokens();
  }
}

/** Hydrate the token store from persistent storage. Call once at startup. */
export async function initNativeAuth(): Promise<void> {
  await hydrateTokenStore();
}
