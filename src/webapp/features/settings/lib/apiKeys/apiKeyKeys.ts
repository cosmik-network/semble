export const apiKeyKeys = {
  all: () => ['apiKeys'] as const,
  list: () => [...apiKeyKeys.all(), 'list'] as const,
};
