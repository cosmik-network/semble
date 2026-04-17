'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { GetProfileResponse } from '@/api-client/ApiClient';
import { ClientCookieAuthService } from '@/services/auth/CookieAuthService.client';
import { verifySessionOnClient } from '@/lib/auth/dal';
import { sanitizeReturnTo } from '@/lib/auth/returnTo';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';
import { isInternalUser, isEarlyTester } from '@/lib/userLists';
import { shouldCaptureAnalytics } from '@/features/analytics/utils';
import { ENABLE_AUTH_LOGGING } from '@/lib/auth/constants';

interface LogoutOptions {
  returnTo?: string;
}

interface AuthContextType {
  user: GetProfileResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
  logout: (options?: LogoutOptions) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname(); // to prevent redirecting to login on landing page

  const logout = useCallback(
    async (options?: LogoutOptions) => {
      if (ENABLE_AUTH_LOGGING) {
        console.log('[useAuth] Initiating logout process');
      }

      // Reset PostHog user identity
      if (shouldCaptureAnalytics()) {
        posthog.reset();
        if (ENABLE_AUTH_LOGGING) {
          console.log('[useAuth] PostHog user identity reset');
        }
      }

      await ClientCookieAuthService.clearTokens();
      queryClient.clear();

      const safeReturnTo = sanitizeReturnTo(options?.returnTo);
      if (safeReturnTo) {
        router.push(`/login?returnTo=${encodeURIComponent(safeReturnTo)}`);
      } else {
        router.push('/login');
      }
    },
    [queryClient, router],
  );

  const query = useQuery<GetProfileResponse | null>({
    queryKey: ['authenticated user'],
    queryFn: async () => {
      const session = await verifySessionOnClient();
      return session;
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

  const refreshAuth = useCallback(async () => {
    await query.refetch();
  }, [query.refetch]);

  useEffect(() => {
    // query.data === null means /api/auth/me returned 401 (genuinely not
    // authenticated). query.isError means a transient failure (500, network)
    // after all retries — don't logout for that, the session may still be valid.
    const isAuthPage =
      pathname === '/login' || pathname === '/signup' || pathname === '/logout';
    if (
      query.data === null &&
      !query.isLoading &&
      pathname !== '/' &&
      !isAuthPage
    )
      logout({ returnTo: pathname ?? undefined });
  }, [query.data, query.isLoading, pathname, logout]);

  // Set super properties for anonymous tracking (no PII)
  useEffect(() => {
    const user = query.data;

    // Set super properties when analytics is enabled and user is available
    // These properties are included in all events automatically
    if (shouldCaptureAnalytics() && user) {
      posthog.register({
        is_internal: isInternalUser(user.handle),
        is_early_tester: isEarlyTester(user.handle),
      });
    }
  }, [query.data]);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user: query.data ?? null,
      isAuthenticated: !!query.data,
      isLoading: query.isLoading,
      refreshAuth,
      logout,
    }),
    [query.data, query.isLoading, refreshAuth, logout],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
