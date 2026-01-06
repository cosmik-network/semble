import { GetProfileResponse } from '@/api-client/ApiClient';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:4000';

interface Options {
  redirectOnFail?: boolean;
}

export const verifySessionOnServer = cache(async (options?: Options) => {
  const cookieStore = await cookies();
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
