export const feedKeys = {
  all: () => ['feeds'] as const,
  infinite: (limit?: number) => [...feedKeys.all(), 'infinite', limit],
};
export const feedKeys = {
  all: ['feeds'] as const,
  global: () => [...feedKeys.all, 'global'] as const,
  infinite: (limit: number) => [...feedKeys.global(), 'infinite', limit] as const,
  gems: () => [...feedKeys.all, 'gems'] as const,
  gemsInfinite: (limit: number) => [...feedKeys.gems(), 'infinite', limit] as const,
};
