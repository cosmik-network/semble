import { NextRequest, NextResponse } from 'next/server';
import type { GetProfileResponse } from '@/api-client/ApiClient';
import { cookies } from 'next/headers';
import { isTokenExpiringSoon } from '@/lib/auth/token';
import { ENABLE_AUTH_LOGGING } from '@/lib/auth/constants';
import { paths } from '@semble/types';
import { deleteAuthCookies } from '@/lib/auth/cookies';

const backendUrl =
  `${process.env.NEXT_PUBLIC_API_BASE_URL}/api` || 'http://127.0.0.1:3000/api';

type AuthResult = {
  isAuth: boolean;
  user?: GetProfileResponse;
  /**
   * Why isAuth is false: 'no_credentials' = plain guest, nothing to repair;
   * 'reauth_required' = credentials existed but the session is dead and the
   * client must send the user through login again. Omitted on transient
   * failures where the client should not change auth state.
   */
  reason?: 'no_credentials' | 'reauth_required';
};

// Prevent concurrent refresh attempts
let refreshPromise: Promise<Response> | null = null;

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
      return NextResponse.json<AuthResult>(
        { isAuth: false, reason: 'no_credentials' },
        { status: 401 },
      );
    }

    // Check if accessToken is expired/missing or expiring soon
    if ((!accessToken || isTokenExpiringSoon(accessToken)) && refreshToken) {
      if (ENABLE_AUTH_LOGGING) {
        const tokenPreview = '...' + refreshToken.slice(-8);
        const accessTokenStatus = !accessToken ? 'missing' : 'expiring soon';

        // Try to extract user ID from access token if available
        let userContext = '';
        if (accessToken) {
          try {
            const payload = JSON.parse(atob(accessToken.split('.')[1]));
            const userDid = payload.did || 'unknown';
            userContext = ` for user: ${userDid}`;
          } catch {
            // Continue without user context if token parsing fails
          }
        }

        console.log(
          `[auth/me] Access token ${accessTokenStatus}${userContext}, attempting refresh with token: ${tokenPreview}`,
        );
      }

      // Use mutex to prevent concurrent refresh attempts
      if (!refreshPromise) {
        refreshPromise = performTokenRefresh(refreshToken, request);
      }

      try {
        const result = await refreshPromise;
        if (ENABLE_AUTH_LOGGING) {
          console.log(`[auth/me] Token refresh completed successfully`);
        }
        return result;
      } catch (error: any) {
        if (ENABLE_AUTH_LOGGING) {
          console.log(`[auth/me] Token refresh error: ${error}`);
        }
        console.error('Token refresh error:', error);

        // If this is a refresh failure with backend response, forward the cookie-clearing headers
        if (error.backendResponse) {
          const response = NextResponse.json<AuthResult>(
            { isAuth: false, reason: 'reauth_required' },
            { status: 401 },
          );

          // Forward the Set-Cookie headers from backend to clear cookies
          const setCookieHeader =
            error.backendResponse.headers.get('set-cookie');
          if (setCookieHeader) {
            response.headers.set('Set-Cookie', setCookieHeader);
          } else {
            deleteAuthCookies(response);
          }

          return response;
        }

        // For other errors, clear cookies manually
        if (ENABLE_AUTH_LOGGING) {
          console.log('[auth/me] Clearing cookies due to token refresh error');
        }
        const response = NextResponse.json<AuthResult>(
          { isAuth: false, reason: 'reauth_required' },
          { status: 401 },
        );
        deleteAuthCookies(response);
        return response;
      } finally {
        refreshPromise = null;
      }
    }

    // AccessToken is valid - fetch profile
    try {
      // Log user context from valid access token
      if (ENABLE_AUTH_LOGGING && accessToken) {
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          const userDid = payload.did || 'unknown';
          console.log(
            `[auth/me] Using valid access token for user: ${userDid}`,
          );
        } catch {
          // Continue without logging user ID if token parsing fails
        }
      }

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
        // Clear cookies on auth failure
        if (ENABLE_AUTH_LOGGING) {
          console.log(
            '[auth/me] Clearing cookies due to profile fetch failure',
          );
        }
        const response = NextResponse.json<AuthResult>(
          {
            isAuth: false,
            // A 401 from the backend with a token it just validated as a
            // cookie means the session is not repairable client-side.
            ...(profileResponse.status === 401
              ? { reason: 'reauth_required' as const }
              : {}),
          },
          { status: profileResponse.status },
        );
        deleteAuthCookies(response);
        return response;
      }

      const user = await profileResponse.json();

      // The backend JWT can be valid while the server-side ATProto OAuth
      // session is gone (PDS writes would fail). Force a full re-login —
      // completing the OAuth flow is the only way to repair the PDS session.
      if (user.atprotoSessionValid === false) {
        if (ENABLE_AUTH_LOGGING) {
          console.log(
            `[auth/me] ATProto session invalid for user: ${user.id} - forcing re-login`,
          );
        }
        const response = NextResponse.json<AuthResult>(
          { isAuth: false, reason: 'reauth_required' },
          { status: 401 },
        );
        deleteAuthCookies(response);
        return response;
      }

      if (ENABLE_AUTH_LOGGING) {
        console.log(
          `[auth/me] Profile fetched successfully for user: ${user.handle} (${user.id})`,
        );
      }
      return NextResponse.json<AuthResult>({ isAuth: true, user });
    } catch (error) {
      console.error('Profile fetch error:', error);
      // Transient (network/backend) failure: report it without a reason so
      // the client keeps its current auth state, and without touching
      // cookies — a backend blip is not proof the session is dead.
      return NextResponse.json<AuthResult>({ isAuth: false }, { status: 500 });
    }
  } catch (error) {
    console.error('Auth me error:', error);
    refreshPromise = null; // Reset on error
    return NextResponse.json<AuthResult>({ isAuth: false }, { status: 500 });
  }
}

async function performTokenRefresh(
  refreshToken: string,
  request: NextRequest,
): Promise<Response> {
  if (ENABLE_AUTH_LOGGING) {
    console.log(`[auth/me] Sending refresh request to backend`);
  }

  // Proxy the refresh request completely to backend
  const refreshResponse = await fetch(`${backendUrl}${paths.refreshToken}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: request.headers.get('cookie') || '',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!refreshResponse.ok) {
    if (ENABLE_AUTH_LOGGING) {
      console.log(
        `[auth/me] Backend refresh failed with status: ${refreshResponse.status}. Message: ${await refreshResponse.text()}`,
      );
    }
    // Create error with backend response to preserve cookie-clearing headers
    const error = new Error(`Refresh failed: ${refreshResponse.status}`) as any;
    error.backendResponse = refreshResponse;
    throw error;
  }

  // Get new tokens from response
  const newTokens = await refreshResponse.json();
  const accessToken = newTokens.accessToken;

  // Fetch profile with new token
  const profileResponse = await fetch(`${backendUrl}${paths.myProfile}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `accessToken=${accessToken}`,
    },
  });

  if (!profileResponse.ok) {
    return NextResponse.json<AuthResult>(
      {
        isAuth: false,
        ...(profileResponse.status === 401
          ? { reason: 'reauth_required' as const }
          : {}),
      },
      { status: 401 },
    );
  }

  const user = await profileResponse.json();

  // Same PDS-session check as the non-refresh path: a valid app session with
  // a dead ATProto OAuth session must force a full re-login.
  if (user.atprotoSessionValid === false) {
    if (ENABLE_AUTH_LOGGING) {
      console.log(
        `[auth/me] ATProto session invalid for user: ${user.id} - forcing re-login (post-refresh)`,
      );
    }
    const response = NextResponse.json<AuthResult>(
      { isAuth: false, reason: 'reauth_required' },
      { status: 401 },
    );
    deleteAuthCookies(response);
    return response;
  }

  if (ENABLE_AUTH_LOGGING) {
    console.log(
      `[auth/me] Token refresh and profile fetch successful for user: ${user.handle} (${user.id})`,
    );
  }
  // Return user profile with backend's Set-Cookie headers
  return new Response(JSON.stringify({ isAuth: true, user }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': refreshResponse.headers.get('set-cookie') || '',
    },
  });
}
