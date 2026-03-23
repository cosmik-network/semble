import { cookies } from 'next/headers';

import { ENABLE_AUTH_LOGGING } from '@/lib/auth/constants';

export interface AuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

export class ServerCookieAuthService {
  // Server-side: read from Next.js cookies
  static async getTokens(): Promise<AuthTokens> {
    const cookieStore = await cookies();
    return {
      accessToken: cookieStore.get('accessToken')?.value || null,
      refreshToken: cookieStore.get('refreshToken')?.value || null,
    };
  }

  // Check if token is expired (same logic as client)
  static isTokenExpired(
    token: string | null,
    bufferMinutes: number = 5,
  ): boolean {
    if (!token) return true;

    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      );
      const userDid = payload.did || 'unknown';
      const expiry = payload.exp * 1000;
      const bufferTime = bufferMinutes * 60 * 1000;
      const isExpired = Date.now() >= expiry - bufferTime;

      if (isExpired && ENABLE_AUTH_LOGGING) {
        console.log(
          `[ServerCookieAuthService] Token expired for user: ${userDid}`,
        );
      }

      return isExpired;
    } catch {
      if (ENABLE_AUTH_LOGGING) {
        console.log(`[ServerCookieAuthService] Invalid token format`);
      }
      return true;
    }
  }
}
