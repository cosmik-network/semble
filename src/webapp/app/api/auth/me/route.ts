import { NextRequest, NextResponse } from 'next/server';
import type { GetProfileResponse } from '@/api-client/ApiClient';
import { cookies } from 'next/headers';
import { isTokenExpiringSoon } from '@/lib/auth/token';
import { refreshSessionOnce } from '@/lib/auth/refresh.server';
import { ENABLE_AUTH_LOGGING } from '@/lib/auth/constants';
import { paths } from '@semble/types';

const backendUrl =
  `${process.env.NEXT_PUBLIC_API_BASE_URL}/api` || 'http://127.0.0.1:3000/api';

type AuthResult = {
  isAuth: boolean;
  user?: GetProfileResponse;
};

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get('accessToken')?.value;
    const refreshToken = cookieStore.get('refreshToken')?.value;

    // No tokens at all - not authenticated
    if (!accessToken && !refreshToken) {
      if (ENABLE_AUTH_LOGGING) {
        console.log('[auth/me] No tokens found - user not authenticated');
      }
      return NextResponse.json<AuthResult>({ isAuth: false }, { status: 401 });
    }

    // Refresh if accessToken is expired/missing or expiring soon
    let refreshSetCookie: string | null = null;
    if ((!accessToken || isTokenExpiringSoon(accessToken)) && refreshToken) {
      if (ENABLE_AUTH_LOGGING) {
        console.log(
          `[auth/me] Access token ${!accessToken ? 'missing' : 'expiring soon'}, attempting refresh`,
        );
      }

      const outcome = await refreshSessionOnce(
        refreshToken,
        request.headers.get('cookie') || '',
      );

      if (!outcome.ok) {
        const response = NextResponse.json<AuthResult>(
          { isAuth: false },
          { status: 500 },
        );
        // Forward the backend's cookie-clearing headers, or clear manually
        if (outcome.setCookie) {
          response.headers.set('Set-Cookie', outcome.setCookie);
        } else {
          if (ENABLE_AUTH_LOGGING) {
            console.log(
              '[auth/me] Clearing cookies due to token refresh error',
            );
          }
          response.cookies.delete('accessToken');
          response.cookies.delete('refreshToken');
        }
        return response;
      }

      accessToken = outcome.accessToken;
      refreshSetCookie = outcome.setCookie;
    }

    // Fetch profile with the (possibly refreshed) access token
    const profileResponse = await fetch(`${backendUrl}${paths.myProfile}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `accessToken=${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      if (ENABLE_AUTH_LOGGING) {
        console.log(
          `[auth/me] Profile fetch failed with status: ${profileResponse.status}; and message: ${await profileResponse.text()}`,
        );
      }
      const response = NextResponse.json<AuthResult>(
        { isAuth: false },
        { status: profileResponse.status },
      );
      response.cookies.delete('accessToken');
      response.cookies.delete('refreshToken');
      return response;
    }

    const user = await profileResponse.json();
    if (ENABLE_AUTH_LOGGING) {
      console.log(
        `[auth/me] Profile fetched successfully for user: ${user.handle} (${user.id})`,
      );
    }

    const response = NextResponse.json<AuthResult>({ isAuth: true, user });
    // Forward rotated tokens to the browser when a refresh happened
    if (refreshSetCookie) {
      response.headers.set('Set-Cookie', refreshSetCookie);
    }
    return response;
  } catch (error) {
    console.error('Auth me error:', error);
    if (ENABLE_AUTH_LOGGING) {
      console.log('[auth/me] Clearing cookies due to unexpected auth error');
    }
    const response = NextResponse.json<AuthResult>(
      { isAuth: false },
      { status: 500 },
    );
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');
    return response;
  }
}
