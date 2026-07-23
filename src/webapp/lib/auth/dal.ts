import type { GetProfileResponse } from '@/api-client/ApiClient';
import { ClientCookieAuthService } from '@/services/auth/CookieAuthService.client';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:4000';

// Fetches the authenticated user's profile (refreshing tokens server-side if
// needed). Only used by the AuthProvider query — data calls authenticate via
// cookies and rely on the 401 interceptor in tsRestClient.
export const verifySessionOnClient =
  async (): Promise<GetProfileResponse | null> => {
    const response = await fetch(`${appUrl}/api/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const { user }: { user: GetProfileResponse } = await response.json();
    return user;
  };

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
