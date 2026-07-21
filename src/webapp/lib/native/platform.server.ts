import { headers } from 'next/headers';
import { isNativeUserAgent } from './userAgent';

/**
 * Server-side detection of the Capacitor native app, via the User-Agent marker
 * Capacitor appends to every WebView request (see capacitor.config.ts
 * `appendUserAgent`). Unlike a Bearer header, the UA is present even on the
 * initial top-level navigation, so server components can use it to skip
 * cookie-based auth gates and defer to the client-side Bearer guard.
 */
export async function isNativeRequest(): Promise<boolean> {
  const headerStore = await headers();
  return isNativeUserAgent(headerStore.get('user-agent'));
}
