export const blueskyKeys = {
  all: () => ['bluesky'] as const,
  post: (uri: string) => [...blueskyKeys.all(), uri] as const,
  infinite: (limit?: number) => [...blueskyKeys.all(), 'infinite', limit],
  searchPosts: (query: string, limit?: number) => [
    ...blueskyKeys.infinite(limit),
    query,
  ],
};
