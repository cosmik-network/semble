import { initClient } from '@ts-rest/core';
import { publicContract } from '@semble/contract';

/**
 * Creates a Semble API client.
 *
 * @param apiKey - Your Semble API key. Optional; without it only public
 *                 endpoints are accessible.
 * @param client - Optional client identifier (e.g. 'mcp', 'my-plugin'), sent
 *                 as the `X-Semble-Client` header for usage analytics.
 * @param baseUrl - The base URL for the Semble API (default: 'https://api.semble.so/xrpc').
 * @returns A Semble API client instance.
 */
export function createSembleClient({
  apiKey,
  client,
  baseUrl = 'https://api.semble.so/xrpc',
}: {
  apiKey?: string;
  client?: string;
  baseUrl?: string;
} = {}) {
  return initClient(publicContract, {
    baseUrl,
    baseHeaders: {
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
      ...(client ? { 'x-semble-client': client } : {}),
    },
  });
}

export type { publicContract as contract };

export type SembleClient = ReturnType<typeof createSembleClient>;
