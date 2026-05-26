import { createSembleClient } from '@/services/client.apiClient';
import type { ApiKey, NewApiKey } from '@semble/types';

export async function listApiKeys(): Promise<ApiKey[]> {
  const client = createSembleClient();
  const res = await client.listApiKeys();
  return res.keys;
}

export async function createApiKey(name: string): Promise<NewApiKey> {
  const client = createSembleClient();
  return client.createApiKey({ name });
}

export async function updateApiKey(id: string, name: string): Promise<ApiKey> {
  const client = createSembleClient();
  return client.updateApiKey({ id, name });
}

export async function revokeApiKey(id: string): Promise<void> {
  const client = createSembleClient();
  await client.revokeApiKey({ id });
}
