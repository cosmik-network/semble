import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sanitizeReturnTo } from './lib/auth/returnTo';

const RETURN_TO_COOKIE = 'postLoginReturnTo';

function safeDecode(raw: string): string | null {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

function withPathHeaders(request: NextRequest, pathname: string, search: string) {
  const headers = new Headers(request.headers);
  headers.set('x-pathname', pathname);
  headers.set('x-pathname-with-search', `${pathname}${search}`);
  return headers;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Consume the one-shot return-to cookie when the user lands on /home
  // after a successful login (OAuth round-trip or app-password fallback).
  if (pathname === '/home') {
    const raw = request.cookies.get(RETURN_TO_COOKIE)?.value;
    if (raw) {
      const decoded = safeDecode(raw);
      const safe = sanitizeReturnTo(decoded);
      if (safe && safe !== '/home') {
        const target = new URL(safe, request.url);
        const response = NextResponse.redirect(target);
        response.cookies.set(RETURN_TO_COOKIE, '', { path: '/', maxAge: 0 });
        return response;
      }
      const response = NextResponse.next({
        request: { headers: withPathHeaders(request, pathname, search) },
      });
      response.cookies.set(RETURN_TO_COOKIE, '', { path: '/', maxAge: 0 });
      return response;
    }
  }

  // Persist returnTo across /login refreshes. If the URL carries a valid
  // returnTo, mirror it into a cookie. If the URL is missing it but the
  // cookie has one, redirect to /login?returnTo=<cookie> so the form keeps
  // working and subsequent refreshes don't lose the destination.
  if (pathname === '/login') {
    const rawParam = request.nextUrl.searchParams.get('returnTo');
    const safeFromParam = rawParam ? sanitizeReturnTo(rawParam) : null;

    if (safeFromParam) {
      const response = NextResponse.next({
        request: { headers: withPathHeaders(request, pathname, search) },
      });
      response.cookies.set(RETURN_TO_COOKIE, safeFromParam, {
        path: '/',
        maxAge: 600,
        sameSite: 'lax',
      });
      return response;
    }

    if (!rawParam) {
      const rawCookie = request.cookies.get(RETURN_TO_COOKIE)?.value;
      if (rawCookie) {
        const safeFromCookie = sanitizeReturnTo(safeDecode(rawCookie));
        if (safeFromCookie) {
          const target = new URL(
            `/login?returnTo=${encodeURIComponent(safeFromCookie)}`,
            request.url,
          );
          return NextResponse.redirect(target);
        }
      }
    }
  }

  return NextResponse.next({
    request: { headers: withPathHeaders(request, pathname, search) },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
