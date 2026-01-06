'use client';

import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { GetProfileResponse } from '@/api-client/ApiClient';
import { ClientCookieAuthService } from '@/services/auth/CookieAuthService.client';
import { verifySessionOnClient } from '@/lib/auth/dal';
import { usePathname } from 'next/navigation';

const ENABLE_AUTH_LOGGING = true;

interface AuthContextType {
  user: GetProfileResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname(); // to prevent redirecting to login on landing page

  const refreshAuth = async () => {
    await query.refetch();
  };

  const logout = async () => {
    if (ENABLE_AUTH_LOGGING) {
      console.log('[useAuth] Initiating logout process');
    }
    await ClientCookieAuthService.clearTokens();
    queryClient.clear();
    router.push('/login');
  };

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

  useEffect(() => {
    // Handle other auth errors
    if (query.isError && !query.isLoading && pathname !== '/') logout();
  }, [query.data, query.isError, query.isLoading, pathname, router, logout]);

  const contextValue: AuthContextType = {
    user: query.data ?? null,
    isAuthenticated: !!query.data,
    isLoading: query.isLoading,
    refreshAuth,
    logout,
  };

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
