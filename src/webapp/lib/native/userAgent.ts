// Marker appended to the WebView User-Agent by Capacitor (see
// `appendUserAgent` in capacitor.config.ts). Present on every request the
// native WebView makes — including top-level document navigations, which is
// why it's the reliable signal for server-side native detection (a Bearer
// Authorization header is NOT sent on navigations).
export const NATIVE_APP_UA_MARKER = 'SembleNativeApp';

/** True if a User-Agent string belongs to the Capacitor native app. */
export function isNativeUserAgent(
  userAgent: string | null | undefined,
): boolean {
  return !!userAgent && userAgent.includes(NATIVE_APP_UA_MARKER);
}
