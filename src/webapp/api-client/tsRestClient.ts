import { initClient } from '@ts-rest/core';
import { contract } from '@semble/contract';

export function createTsRestClient(baseUrl: string, accessToken?: string) {
  return initClient(contract, {
    baseUrl,
    credentials: accessToken ? 'omit' : 'include',
    baseHeaders: accessToken ? { Cookie: `accessToken=${accessToken}` } : {},
  });
}

export type TsRestClient = ReturnType<typeof createTsRestClient>;
