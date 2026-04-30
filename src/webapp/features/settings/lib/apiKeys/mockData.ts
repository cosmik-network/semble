import type { ApiKey } from './types';

export const MOCK_API_KEYS: ApiKey[] = [
  {
    id: 'mock-1',
    name: 'Production server',
    prefix: 'sk_ab12cd34',
    createdAt: new Date('2026-01-15'),
    lastUsedAt: new Date('2026-04-28'),
    expiresAt: null,
  },
  {
    id: 'mock-2',
    name: 'CI/CD pipeline',
    prefix: 'sk_ef56gh78',
    createdAt: new Date('2026-02-03'),
    lastUsedAt: new Date('2026-04-20'),
    expiresAt: null,
  },
  {
    id: 'mock-3',
    name: 'Local development',
    prefix: 'sk_ij90kl12',
    createdAt: new Date('2026-04-01'),
    lastUsedAt: null,
    expiresAt: null,
  },
];
