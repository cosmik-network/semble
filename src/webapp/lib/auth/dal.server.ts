import { GetProfileResponse } from '@/api-client/ApiClient';
import { cookies } from 'next/headers';
import { cache } from 'react';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:4000';

export const verifySessionOnServer = cache(async () => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;

  if (!accessToken || !refreshToken) {
    return null;
  }

  const res = await fetch(`${appUrl}/api/auth/me`, {
    headers: {
      Cookie: cookieStore.toString(),
    },
  });

  if (!res.ok) {
    return null;
  }

  const { user }: { user: GetProfileResponse } = await res.json();

  return user;
});
