import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from './platform';

/**
 * Token storage for the Capacitor (native) build.
 *
 * The web (browser) build never uses this — it relies on httpOnly cookies.
 * In native mode there is no cookie the WebView can send cross-site, so we
 * hold the session TokenPair ourselves in Capacitor Preferences (Keychain on
 * iOS, encrypted SharedPreferences on Android) and send the access token as
 * `Authorization: Bearer <jwt>`.
 *
 * The request transport (`tsRestClient`) reads the access token synchronously
 * per request, so we keep an in-memory mirror as the source of truth for reads
 * and write through to Preferences asynchronously. `hydrate()` must run once at
 * app startup to populate the mirror from persistent storage.
 */

const ACCESS_TOKEN_KEY = 'semble.accessToken';
const REFRESH_TOKEN_KEY = 'semble.refreshToken';

export interface NativeTokens {
  accessToken: string;
  refreshToken: string;
}

let accessTokenCache: string | null = null;
let refreshTokenCache: string | null = null;
let hydrated = false;

/** Load persisted tokens into the in-memory mirror. Call once on startup. */
export async function hydrateTokenStore(): Promise<void> {
  if (!isNativeApp() || hydrated) return;
  const [{ value: access }, { value: refresh }] = await Promise.all([
    Preferences.get({ key: ACCESS_TOKEN_KEY }),
    Preferences.get({ key: REFRESH_TOKEN_KEY }),
  ]);
  accessTokenCache = access ?? null;
  refreshTokenCache = refresh ?? null;
  hydrated = true;
}

/** Synchronous read of the current access token (source of truth = in-memory mirror). */
export function getAccessTokenSync(): string | null {
  return accessTokenCache;
}

export function getRefreshTokenSync(): string | null {
  return refreshTokenCache;
}

export async function setTokens(tokens: NativeTokens): Promise<void> {
  accessTokenCache = tokens.accessToken;
  refreshTokenCache = tokens.refreshToken;
  hydrated = true;
  await Promise.all([
    Preferences.set({ key: ACCESS_TOKEN_KEY, value: tokens.accessToken }),
    Preferences.set({ key: REFRESH_TOKEN_KEY, value: tokens.refreshToken }),
  ]);
}

export async function clearTokens(): Promise<void> {
  accessTokenCache = null;
  refreshTokenCache = null;
  await Promise.all([
    Preferences.remove({ key: ACCESS_TOKEN_KEY }),
    Preferences.remove({ key: REFRESH_TOKEN_KEY }),
  ]);
}

export function hasTokens(): boolean {
  return accessTokenCache !== null;
}
