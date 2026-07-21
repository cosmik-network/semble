import { GetProfileResponse } from '@/api-client/ApiClient';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { isNativeRequest } from '@/lib/native/platform.server';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:4000';

interface Options {
  redirectOnFail?: boolean;
}

export const verifySessionOnServer = cache(async (options?: Options) => {
  // Native (Capacitor) requests can't send the session cookie, and a top-level
  // navigation can't carry the Bearer header either. Detect native via the UA
  // marker and skip server-side gating entirely — never redirect. The page
  // renders and the client-side useAuth guard (which has the Bearer token from
  // Preferences) enforces auth and redirects if needed.
  if (await isNativeRequest()) {
    return null;
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;

  // tokens are missing
  if (!accessToken || !refreshToken) {
    if (options?.redirectOnFail) {
      redirect('/login');
    }
    return null;
  }

  const res = await fetch(`${appUrl}/api/auth/me`, {
    headers: {
      Cookie: cookieStore.toString(), // forward user's cookies
    },
  });

  if (!res.ok) {
    if (options?.redirectOnFail) {
      redirect('/login');
    }
    return null;
  }

  const { user }: { user: GetProfileResponse } = await res.json();

  return user;
});
