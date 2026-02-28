export const connectionKeys = {
  all: () => ['connections'] as const,
  forwardForUrl: (url: string) => ['connections', 'forward', url] as const,
  forwardForUrlInfinite: (url: string, limit?: number) =>
    ['connections', 'forward', url, 'infinite', limit] as const,
  backwardForUrl: (url: string) => ['connections', 'backward', url] as const,
  backwardForUrlInfinite: (url: string, limit?: number) =>
    ['connections', 'backward', url, 'infinite', limit] as const,
  userConnections: (identifier: string) =>
    ['connections', 'user', identifier] as const,
};
