import { initClient } from '@ts-rest/core';
import { publicContract } from '@semble/contract';

/**
 * Creates a Semble API client.
 *
 * @param apiKey - Your Semble API key.
 * @param baseUrl - The base URL for the Semble API (default: 'https://api.semble.so/xrpc').
 * @returns A Semble API client instance.
 */
export function createSembleClient({
  apiKey,
  baseUrl = 'https://api.semble.so/xrpc',
}: {
  apiKey: string;
  baseUrl?: string;
}) {
  return initClient(publicContract, {
    baseUrl,
    baseHeaders: { 'x-api-key': apiKey },
  });
}

export type { publicContract as contract };

export type SembleClient = ReturnType<typeof createSembleClient>;
