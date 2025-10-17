/**
 * Authentication utilities for the client-side application
 */

import { TokenManager } from './TokenManager';
import { ClientTokenStorage } from './storage/ClientTokenStorage';
import { ServerTokenStorage } from './storage/ServerTokenStorage';
import { ApiTokenRefresher } from './TokenRefresher';

// Check if the user is authenticated
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') {
    return false; // Not authenticated in server-side context
  }

  const accessToken = localStorage.getItem('accessToken');
  return !!accessToken;
};

// Get the access token
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem('accessToken');
};

export const getAccessTokenInServerComponent = async (): Promise<
  string | null
> => {
  // Get access token on server side
  const { cookies } = await import('next/headers');
  const cookiesStore = await cookies();
  const accessToken = cookiesStore.get('accessToken')?.value || null;
  return accessToken;
};

// Get the refresh token
export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem('refreshToken');
};

// Clear authentication tokens (logout)
export const clearAuth = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

// Client-side token manager
export const createClientTokenManager = () => {
  const storage = new ClientTokenStorage();
  const refresher = new ApiTokenRefresher(
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  );
  return new TokenManager(storage, refresher);
};

// Server-side token manager (read-only, no refresh capability)
export const createServerTokenManager = async () => {
  const { cookies } = await import('next/headers');
  const cookiesStore = await cookies();
  const storage = new ServerTokenStorage(cookiesStore);
  const refresher = new ApiTokenRefresher(''); // Won't be used
  return new TokenManager(storage, refresher);
};

export const createExtensionTokenManager = () => {
  const storage = new ClientTokenStorage();
  const refresher = new ApiTokenRefresher(
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  );
  return new TokenManager(storage, refresher);
};

