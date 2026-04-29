'use client';

// Mock implementation backed by useState.
//
// To connect real data, replace this hook with TanStack Query:
//   - List:   useSuspenseQuery({ queryKey: apiKeyKeys.list(), queryFn: () => dal.listApiKeys() })
//   - Create: useMutation({ mutationFn: (name) => dal.createApiKey(name), onSuccess: () => queryClient.invalidateQueries(...) })
//   - Revoke: useMutation({ mutationFn: (id) => dal.revokeApiKey(id), onSuccess: () => queryClient.invalidateQueries(...) })
//
// The container's `initialKeys` prop can be dropped once real data is in place.

import { useCallback, useState } from 'react';
import type { ApiKey, NewApiKey } from './types';
import { MOCK_API_KEYS } from './mockData';

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const random = Array.from({ length: 32 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('');
  return `sk_${random}`;
}

export function useApiKeys(initialKeys: ApiKey[] = MOCK_API_KEYS) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);

  const createKey = useCallback((name: string): NewApiKey => {
    const token = generateToken();
    const newKey: NewApiKey = {
      id: crypto.randomUUID(),
      name,
      prefix: token.slice(0, 10),
      createdAt: new Date(),
      lastUsedAt: null,
      expiresAt: null,
      token,
    };
    setKeys((prev) => [newKey, ...prev]);
    return newKey;
  }, []);

  const revokeKey = useCallback((id: string): void => {
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }, []);

  return { keys, createKey, revokeKey };
}
