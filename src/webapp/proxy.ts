import { NextRequest, NextResponse } from 'next/server';

// '/profile' bare only — '/profile/[handle]' pages are public
const PROTECTED = ['/home', '/notifications', '/settings', '/profile'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some(
    (p) => pathname === p || (p !== '/profile' && pathname.startsWith(p + '/')),
  );
  if (!isProtected) {
    return NextResponse.next();
  }

  // Presence check only — token freshness is handled by verifySessionOnServer
  // and the client's 401 interceptor.
  if (
    !request.cookies.has('refreshToken') &&
    !request.cookies.has('accessToken')
  ) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Literal segments only — parenthesized groups in the matcher silently 404
  // pages in Next 16. Route membership is re-checked in code above.
  matcher: [
    '/home/:path*',
    '/notifications/:path*',
    '/settings/:path*',
    '/profile',
  ],
};
