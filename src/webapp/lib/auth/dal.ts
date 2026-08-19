import type { GetProfileResponse } from '@/api-client/ApiClient';
import { cache } from 'react';
import { ClientCookieAuthService } from '@/services/auth/CookieAuthService.client';
import { getLoginPathWithRedirect } from '@/lib/auth/redirect';
import { NoSessionError } from '@/api-client/errors';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:4000';

// Concurrent-call dedup: many DAL functions preflight the session check, so a
// page mount fires several at once — share one in-flight request.
let refreshPromise: Promise<GetProfileResponse | null> | null = null;

// Short time-based memo. React's cache() is a no-op in the browser and the
// mutex above only covers concurrent calls; without this, sequential queries
// milliseconds apart each cost a full /api/auth/me round trip (which in turn
// hits the backend's myProfile).
const MEMO_TTL_MS = 10_000;
let memo: {
  at: number;
  value?: GetProfileResponse | null;
  error?: unknown;
} | null = null;

interface VerifySessionOptions {
  redirectOnFail?: boolean;
}

export const verifySessionOnClient = cache(
  async (
    options?: VerifySessionOptions,
  ): Promise<GetProfileResponse | null> => {
    const { redirectOnFail = false } = options || {};

    // Browser-only by construction: it authenticates via `credentials: 'include'`
    // on HttpOnly cookies, which a server render cannot supply. Short-circuit
    // rather than firing an /api/auth/me request that always 401s during SSR.
    // Server Components should use verifySessionOnServer from dal.server.ts.
    if (typeof window === 'undefined') return null;

    if (memo && Date.now() - memo.at < MEMO_TTL_MS) {
      if ('error' in memo && memo.error !== undefined) throw memo.error;
      if (!memo.value && redirectOnFail) {
        window.location.href = getLoginPathWithRedirect();
        return null;
      }
      return memo.value ?? null;
    }

    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      try {
        const response = await fetch(`${appUrl}/api/auth/me`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          // The route distinguishes a plain guest (no credentials) from a
          // session that must be re-established (dead ATProto session,
          // failed refresh). The latter surfaces as NoSessionError (a 401
          // ApiError) so the global auth handler logs the user out once,
          // instead of queries retrying a definitive failure.
          let reason: string | undefined;
          try {
            reason = (await response.json())?.reason;
          } catch {
            // Non-JSON error body — treat as transient.
          }

          if (reason === 'reauth_required') {
            const error = new NoSessionError();
            memo = { at: Date.now(), error };
            throw error;
          }

          memo = { at: Date.now(), value: null };
          if (redirectOnFail) {
            // Redirect to login only if requested
            window.location.href = getLoginPathWithRedirect();
          }
          return null;
        }

        const { user }: { user: GetProfileResponse } = await response.json();
        memo = { at: Date.now(), value: user };
        return user;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },
);

/**
 * Drops the memoized session. Must be called on logout: the memo outlives the
 * cookies, so without this the next session check within the TTL replays the
 * logged-in user instead of seeing the cleared credentials.
 */
export const clearSessionMemo = (): void => {
  memo = null;
};

/**
 * Logs out the current user by clearing tokens and redirecting to login
 * Can be called from both client and server contexts
 */
export const logoutUser = async (): Promise<void> => {
  clearSessionMemo();
  await ClientCookieAuthService.clearTokens();
  if (typeof window !== 'undefined') {
    // Remember where the user was so re-authenticating returns them there
    window.location.href = getLoginPathWithRedirect();
  }
};
