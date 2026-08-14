import { GetProfileResponse } from '@/api-client/ApiClient';
import { createServerSembleClient } from '@/services/server.apiClient';
import { ServerCookieAuthService } from '@/services/auth/CookieAuthService.server';
import { redirect } from 'next/navigation';
import { cache } from 'react';

interface Options {
  redirectOnFail?: boolean;
}

export type ServerSession =
  /** Verified against the backend this request. */
  | { status: 'authenticated'; user: GetProfileResponse }
  /** No credentials at all — definitively signed out. */
  | { status: 'guest' }
  /**
   * Credentials exist but the server could not verify them: the access token has
   * expired, or the backend failed. Only the client can resolve this — a Server
   * Component cannot set cookies, so it cannot perform a token refresh. Callers
   * must not treat this as signed out, and must not seed it into the query cache
   * (a cached `null` would pin the user as a guest for the query's staleTime).
   */
  | { status: 'unresolved' };

/**
 * Server-side session check, memoized per request with React `cache()` so every
 * layout, page and prefetch in one render shares a single backend call.
 *
 * Calls the backend's myProfile directly rather than going through this app's own
 * /api/auth/me route handler: that costs a second serial round trip on the
 * critical path, and its token refresh cannot take effect from a Server
 * Component anyway — the rotated tokens in its response would be dropped.
 *
 * Server Components only. Client Components use verifySessionOnClient from dal.ts.
 */
export const getServerSession = cache(async (): Promise<ServerSession> => {
  const { accessToken, refreshToken } =
    await ServerCookieAuthService.getTokens();

  // Guests cost nothing — no credentials means no network call at all.
  if (!accessToken && !refreshToken) return { status: 'guest' };
  if (!accessToken) return { status: 'unresolved' };

  // Local JWT `exp` check, no network. Buffer of 0 so an expiring-but-valid
  // token still serves this request; the client refreshes it after hydration.
  if (ServerCookieAuthService.isTokenExpired(accessToken, 0)) {
    return { status: 'unresolved' };
  }

  try {
    const client = await createServerSembleClient();
    return { status: 'authenticated', user: await client.getMyProfile() };
  } catch {
    // Never throw from a session check, and never downgrade to 'guest' — a
    // backend hiccup is not proof the user is signed out.
    return { status: 'unresolved' };
  }
});

/** The session user, or null when not verified. Use getServerSession() when the difference between "guest" and "unresolved" matters. */
export const getSession = async (): Promise<GetProfileResponse | null> => {
  const session = await getServerSession();
  return session.status === 'authenticated' ? session.user : null;
};

/**
 * Session check with optional redirect, for pages that require auth.
 * Shares getServerSession()'s per-request cache.
 */
export const verifySessionOnServer = async (options?: Options) => {
  const session = await getServerSession();

  // Only redirect on a definitive 'guest'. Bouncing 'unresolved' would send a
  // legitimate user to /login every time their access token aged out; instead
  // render and let AuthProvider hit /api/auth/me, which can refresh and set
  // cookies.
  if (session.status === 'guest' && options?.redirectOnFail) {
    redirect('/login');
  }

  return session.status === 'authenticated' ? session.user : null;
};
