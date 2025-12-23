import type { GetProfileResponse } from '@/api-client/ApiClient';
import { cache } from 'react';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:4000';

let isRefreshing = false;
let refreshPromise: Promise<GetProfileResponse | null> | null = null;

interface VerifySessionOptions {
  redirectOnFail?: boolean;
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
