import type { GetProfileResponse } from '@/api-client/ApiClient';
import { createApiClient } from '@/api-client/ApiClient';
import { cache } from 'react';
import { ClientCookieAuthService } from '@/services/auth/CookieAuthService.client';
import { isNativeApp } from '@/lib/native/platform';
import {
  getAccessTokenSync,
  hasTokens,
  hydrateTokenStore,
} from '@/lib/native/tokenStore';
import { logoutNativeSession, refreshNativeSession } from '@/lib/native/auth';
import { isTokenExpiringSoon } from '@/lib/auth/token';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:4000';

let isRefreshing = false;
let refreshPromise: Promise<GetProfileResponse | null> | null = null;

interface VerifySessionOptions {
  redirectOnFail?: boolean;
}

/**
 * Native (Capacitor) session verification. No cookie / /api/auth/me proxy is
 * available in the WebView, so we refresh the Bearer token locally if needed
 * and fetch the profile directly with it.
 */
async function verifyNativeSession(
  redirectOnFail: boolean,
): Promise<GetProfileResponse | null> {
  await hydrateTokenStore();

  if (!hasTokens()) {
    if (redirectOnFail && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  // Proactively refresh a soon-to-expire access token.
  if (isTokenExpiringSoon(getAccessTokenSync())) {
    const refreshed = await refreshNativeSession();
    if (!refreshed) {
      await logoutNativeSession();
      if (redirectOnFail && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return null;
    }
  }

  try {
    const client = createApiClient();
    return await client.getMyProfile();
  } catch {
    if (redirectOnFail && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }
}

export const verifySessionOnClient = cache(
  async (
    options?: VerifySessionOptions,
  ): Promise<GetProfileResponse | null> => {
    const { redirectOnFail = false } = options || {};

    if (isNativeApp()) {
      return verifyNativeSession(redirectOnFail);
    }

    if (isRefreshing && refreshPromise) {
      console.log('Auth refresh already in progress, waiting...');
      return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${appUrl}/api/auth/me`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          if (redirectOnFail && typeof window !== 'undefined') {
            // Redirect to login only if requested
            window.location.href = '/login';
          }
          return null;
        }

        const { user }: { user: GetProfileResponse } = await response.json();
        return user;
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },
);

/**
 * Logs out the current user by clearing tokens and redirecting to login
 * Can be called from both client and server contexts
 */
export const logoutUser = async (): Promise<void> => {
  await ClientCookieAuthService.clearTokens();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};
