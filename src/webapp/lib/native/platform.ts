import { Capacitor } from '@capacitor/core';

/**
 * True when the web app is running inside the Capacitor native shell
 * (iOS/Android WebView) rather than a normal browser tab.
 *
 * In native mode the app authenticates with a locally-stored Bearer token
 * instead of `.semble.so` httpOnly cookies (which iOS WKWebView drops as
 * cross-site). See `lib/native/tokenStore.ts` and `api-client/tsRestClient.ts`.
 */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// Custom URL scheme the backend deep-links to after a native OAuth flow.
// Must match `NATIVE_APP_SCHEME` on the backend and the scheme registered in
// the iOS/Android Capacitor projects. Deep link shape: `com.semble.app://auth?code=...`.
export const NATIVE_APP_SCHEME = 'com.semble.app';
export const NATIVE_AUTH_DEEP_LINK_HOST = 'auth';
