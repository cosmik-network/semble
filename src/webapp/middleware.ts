import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sanitizeReturnTo } from './lib/auth/returnTo';

const RETURN_TO_COOKIE = 'postLoginReturnTo';

const PROTECTED_PREFIXES = ['/home', '/notifications', '/settings'];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function hasSessionCookies(request: NextRequest): boolean {
  return (
    !!request.cookies.get('accessToken')?.value &&
    !!request.cookies.get('refreshToken')?.value
  );
}

function safeDecode(raw: string): string | null {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Consume the one-shot return-to cookie when the user lands on /home
  // after the Bluesky OAuth round-trip. The backend callback hardcodes its
  // redirect to /home, so this cookie is how the pre-OAuth destination
  // survives the round-trip.
  if (pathname === '/home' && hasSessionCookies(request)) {
    const raw = request.cookies.get(RETURN_TO_COOKIE)?.value;
    if (raw) {
      const safe = sanitizeReturnTo(safeDecode(raw));
      if (safe && safe !== '/home') {
        const response = NextResponse.redirect(new URL(safe, request.url));
        response.cookies.set(RETURN_TO_COOKIE, '', { path: '/', maxAge: 0 });
        return response;
      }
      const response = NextResponse.next();
      response.cookies.set(RETURN_TO_COOKIE, '', { path: '/', maxAge: 0 });
      return response;
    }
  }

  // Gate protected routes. Checking cookie presence in the proxy avoids
  // rendering the page for unauthenticated users at all, which is the
  // recommended Next.js pattern. Expired-but-present tokens pass through
  // here and are handled by downstream data fetches.
  if (isProtectedPath(pathname) && !hasSessionCookies(request)) {
    const returnTo = `${pathname}${search}`;
    const safe = sanitizeReturnTo(returnTo);
    const loginUrl = new URL(
      safe ? `/login?returnTo=${encodeURIComponent(safe)}` : '/login',
      request.url,
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
