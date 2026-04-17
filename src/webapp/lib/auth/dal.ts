import type { GetProfileResponse } from '@/api-client/ApiClient';
import { cache } from 'react';
import { ClientCookieAuthService } from '@/services/auth/CookieAuthService.client';
import { sanitizeReturnTo } from './returnTo';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:4000';

let isRefreshing = false;
let refreshPromise: Promise<GetProfileResponse | null> | null = null;

interface VerifySessionOptions {
  redirectOnFail?: boolean;
}

function buildLoginUrlFromCurrentLocation(): string {
  if (typeof window === 'undefined') return '/login';
  const current = window.location.pathname + window.location.search;
  const safe = sanitizeReturnTo(current);
  return safe ? `/login?returnTo=${encodeURIComponent(safe)}` : '/login';
}

export const verifySessionOnClient = cache(
  async (
    options?: VerifySessionOptions,
  ): Promise<GetProfileResponse | null> => {
    const { redirectOnFail = false } = options || {};

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
          if (
            redirectOnFail &&
            typeof window !== 'undefined' &&
            response.status === 401
          ) {
            window.location.href = buildLoginUrlFromCurrentLocation();
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
    window.location.href = buildLoginUrlFromCurrentLocation();
  }
};
