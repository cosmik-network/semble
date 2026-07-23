import { initClient, tsRestFetchApi } from '@ts-rest/core';
import { contract } from '@semble/contract';

// Per-tab mutex: the Next server serializes refreshes across tabs, but this
// avoids hammering /api/auth/refresh when several queries 401 at once.
let clientRefresh: Promise<boolean> | null = null;

async function refreshViaNextRoute(): Promise<boolean> {
  if (!clientRefresh) {
    clientRefresh = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        clientRefresh = null;
      });
  }
  return clientRefresh;
}

export function createTsRestClient(baseUrl: string, accessToken?: string) {
  return initClient(contract, {
    baseUrl,
    credentials: accessToken ? 'omit' : 'include',
    baseHeaders: accessToken ? { Cookie: `accessToken=${accessToken}` } : {},
    api: async (args) => {
      const response = await tsRestFetchApi(args);

      // Cookie-authenticated browser requests only — extension/server clients
      // pass an explicit accessToken and must not be intercepted.
      const isBrowserCookieAuth = !accessToken && typeof window !== 'undefined';
      if (response.status === 401 && isBrowserCookieAuth) {
        if (await refreshViaNextRoute()) {
          return tsRestFetchApi(args); // retry once with rotated cookies
        }
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }

      return response;
    },
  });
}

export type TsRestClient = ReturnType<typeof createTsRestClient>;
