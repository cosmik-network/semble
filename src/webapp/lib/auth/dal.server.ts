import { GetProfileResponse } from '@/api-client/ApiClient';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { sanitizeReturnTo } from './returnTo';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:4000';

interface Options {
  redirectOnFail?: boolean;
}

async function buildLoginRedirect(): Promise<string> {
  const headerList = await headers();
  const pathWithSearch =
    headerList.get('x-pathname-with-search') ?? headerList.get('x-pathname');
  const safe = sanitizeReturnTo(pathWithSearch ?? undefined);
  if (!safe) return '/login';
  return `/login?returnTo=${encodeURIComponent(safe)}`;
}

export const verifySessionOnServer = cache(async (options?: Options) => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;

  // tokens are missing
  if (!accessToken || !refreshToken) {
    if (options?.redirectOnFail) {
      redirect(await buildLoginRedirect());
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
      redirect(await buildLoginRedirect());
    }
    return null;
  }

  const { user }: { user: GetProfileResponse } = await res.json();

  return user;
});
