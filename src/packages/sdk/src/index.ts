import { initClient } from '@ts-rest/core';
import { contract } from '@semble/contract';

export function createSembleClient({
  apiKey,
  baseUrl = 'https://api.semble.so',
}: {
  apiKey: string;
  baseUrl?: string;
}) {
  return initClient(contract, {
    baseUrl,
    baseHeaders: { 'x-api-key': apiKey },
  });
}

export function createBrowserClient(baseUrl = 'https://api.semble.so') {
  return initClient(contract, {
    baseUrl,
    credentials: 'include',
  });
}

export function createDynamicClient(getToken: () => string) {
  return initClient(contract, {
    baseUrl: 'https://api.semble.so',
    baseHeaders: { authorization: () => `Bearer ${getToken()}` },
  });
}

export type { contract };
