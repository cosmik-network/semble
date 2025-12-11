export const feedKeys = {
  all: () => ['feeds'] as const,
  infinite: (limit?: number) => [...feedKeys.all(), 'infinite', limit],
};
