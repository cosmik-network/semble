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
    retry: false,
  });

  const refreshAuth = useCallback(async () => {
    await query.refetch();
  }, [query.refetch]);

  useEffect(() => {
    // A 401 on /login, /signup, /logout is expected — don't self-trigger
    // logout there, or it would strip ?returnTo from the URL.
    const isAuthPage =
      pathname === '/login' || pathname === '/signup' || pathname === '/logout';
    if (query.isError && !query.isLoading && pathname !== '/' && !isAuthPage)
      logout({ returnTo: pathname ?? undefined });
  }, [query.isError, query.isLoading, pathname, logout]);

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
