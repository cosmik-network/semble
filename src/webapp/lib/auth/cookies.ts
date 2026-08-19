import { NextResponse } from 'next/server';

const AUTH_COOKIE_NAMES = ['accessToken', 'refreshToken'] as const;

/**
 * Cookie domain matching the backend's CookieService.getCookieDomain():
 * prod sets Domain=.semble.so, dev Domain=.dev.semble.so, local none.
 * Derived from NEXT_PUBLIC_APP_URL's hostname.
 */
function getCookieDomain(): string | undefined {
  try {
    const hostname = new URL(process.env.NEXT_PUBLIC_APP_URL || '').hostname;
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
      return undefined;
    }
    return `.${hostname}`;
  } catch {
    return undefined;
  }
}

function expiredCookie(name: string, domain?: string): string {
  const parts = [
    `${name}=`,
    'Path=/',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (domain) {
    parts.push(`Domain=${domain}`, 'Secure');
  }
  return parts.join('; ');
}

/**
 * Deletes the auth cookies for real. The backend sets them with
 * Domain=.semble.so; a deletion cookie only matches when its Domain and Path
 * attributes match, so `response.cookies.delete(name)` (host-only, no Domain)
 * leaves the original cookie standing — which kept dead sessions bouncing
 * between /login and /home. Emit both the domain and host-only variants via
 * raw Set-Cookie headers (appending, since ResponseCookies keys by name and
 * would collapse the two variants).
 */
export function deleteAuthCookies<T extends NextResponse | Response>(
  response: T,
): T {
  const domain = getCookieDomain();
  for (const name of AUTH_COOKIE_NAMES) {
    response.headers.append('Set-Cookie', expiredCookie(name));
    if (domain) {
      response.headers.append('Set-Cookie', expiredCookie(name, domain));
    }
  }
  return response;
}
