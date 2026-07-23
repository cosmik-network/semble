import { ENABLE_AUTH_LOGGING } from '@/lib/auth/constants';
import { paths } from '@semble/types';

const backendUrl =
  `${process.env.NEXT_PUBLIC_API_BASE_URL}/api` || 'http://127.0.0.1:3000/api';

export type RefreshOutcome =
  | { ok: true; accessToken: string; setCookie: string }
  | { ok: false; status: number; setCookie: string | null };

// Module-level mutex: the backend rotates refresh tokens atomically, so a
// concurrent second refresh with the same token would fail and log the user
// out. Both /api/auth/me and /api/auth/refresh share this instance.
let refreshPromise: Promise<RefreshOutcome> | null = null;

export function refreshSessionOnce(
  refreshToken: string,
  cookieHeader: string,
): Promise<RefreshOutcome> {
  if (!refreshPromise) {
    refreshPromise = doRefresh(refreshToken, cookieHeader).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh(
  refreshToken: string,
  cookieHeader: string,
): Promise<RefreshOutcome> {
  try {
    if (ENABLE_AUTH_LOGGING) {
      console.log('[auth/refresh] Sending refresh request to backend');
    }

    const refreshResponse = await fetch(`${backendUrl}${paths.refreshToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshResponse.ok) {
      if (ENABLE_AUTH_LOGGING) {
        console.log(
          `[auth/refresh] Backend refresh failed with status: ${refreshResponse.status}. Message: ${await refreshResponse.text()}`,
        );
      }
      // Preserve the backend's Set-Cookie so cookie-clearing reaches the browser
      return {
        ok: false,
        status: refreshResponse.status,
        setCookie: refreshResponse.headers.get('set-cookie'),
      };
    }

    const newTokens = await refreshResponse.json();

    if (ENABLE_AUTH_LOGGING) {
      console.log('[auth/refresh] Token refresh successful');
    }

    return {
      ok: true,
      accessToken: newTokens.accessToken,
      setCookie: refreshResponse.headers.get('set-cookie') || '',
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return { ok: false, status: 500, setCookie: null };
  }
}
