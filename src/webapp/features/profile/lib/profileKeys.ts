export const profileKeys = {
  all: () => ['profiles'] as const,
  profile: (didOrHandle: string, includeStats?: boolean) =>
    [...profileKeys.all(), didOrHandle, { includeStats }] as const,
  mine: () => [...profileKeys.all(), 'mine'] as const,
};
