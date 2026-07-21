import { initClient } from '@ts-rest/core';
import { contract } from '@semble/contract';
import { isNativeApp } from '@/lib/native/platform';
import { getAccessTokenSync } from '@/lib/native/tokenStore';

export function createTsRestClient(baseUrl: string, accessToken?: string) {
  // Native (Capacitor) build: no cookie is available in the WebView, so send
  // the locally-stored access token as a Bearer header. The header value is a
  // function so it's read per request — the singleton client is constructed at
  // import time, before the user has logged in / tokens exist.
  if (isNativeApp()) {
    return initClient(contract, {
      baseUrl,
      credentials: 'omit',
      baseHeaders: {
        Authorization: () => {
          const token = getAccessTokenSync();
          return token ? `Bearer ${token}` : '';
        },
      },
    });
  }

  // Browser build (unchanged): server-side injects the cookie header from the
  // SSR-read token; client-side relies on credentials:'include' sending the
  // httpOnly cookie automatically.
  return initClient(contract, {
    baseUrl,
    credentials: accessToken ? 'omit' : 'include',
    baseHeaders: accessToken ? { Cookie: `accessToken=${accessToken}` } : {},
  });
}

export type TsRestClient = ReturnType<typeof createTsRestClient>;
