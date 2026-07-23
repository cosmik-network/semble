import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { decodeDid, isTokenExpired } from '@/lib/auth/token';

export type ServerSession = { did: string };

interface Options {
  redirectOnFail?: boolean;
}

// Local check only — no network call, no refresh. An expired access token
// with a refresh token present is treated as authenticated: the client's
// 401 interceptor refreshes on the first data call, and the backend
// verifies every request itself.
export const verifySessionOnServer = cache(
  async (options?: Options): Promise<ServerSession | null> => {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const refreshToken = cookieStore.get('refreshToken')?.value;
    const did = decodeDid(accessToken);

    const isAuth = !!did && (!isTokenExpired(accessToken) || !!refreshToken);

    if (!isAuth) {
      if (options?.redirectOnFail) {
        redirect('/login');
      }
      return null;
    }

    return { did };
  },
);
