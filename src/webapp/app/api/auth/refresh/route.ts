import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { refreshSessionOnce } from '@/lib/auth/refresh.server';
import { ENABLE_AUTH_LOGGING } from '@/lib/auth/constants';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refreshToken')?.value;

  if (!refreshToken) {
    if (ENABLE_AUTH_LOGGING) {
      console.log('[auth/refresh] No refresh token - cannot refresh');
    }
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const outcome = await refreshSessionOnce(
    refreshToken,
    request.headers.get('cookie') || '',
  );

  if (!outcome.ok) {
    const response = NextResponse.json({ ok: false }, { status: 401 });
    if (outcome.setCookie) {
      response.headers.set('Set-Cookie', outcome.setCookie);
    } else {
      response.cookies.delete('accessToken');
      response.cookies.delete('refreshToken');
    }
    return response;
  }

  const response = NextResponse.json({ ok: true });
  if (outcome.setCookie) {
    response.headers.set('Set-Cookie', outcome.setCookie);
  }
  return response;
}
