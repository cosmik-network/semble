export const profileKeys = {
  all: () => ['profiles'] as const,
  profile: (didOrHandle: string, includeStats?: boolean) =>
    [...profileKeys.all(), didOrHandle, { includeStats }] as const,
  mine: () => [...profileKeys.all(), 'mine'] as const,
  // Distinct from mine(): the root layout seeds mine() with a stats-less
  // payload, so sharing the key would serve undefined counts.
  mineWithStats: () =>
    [...profileKeys.all(), 'mine', { includeStats: true }] as const,
};
