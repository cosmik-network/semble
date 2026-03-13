import { ConnectionType } from '@semble/types';

export const connectionKeys = {
  all: () => ['connections'] as const,
  forwardForUrl: (url: string) => ['connections', 'forward', url] as const,
  forwardForUrlInfinite: (
    url: string,
    limit?: number,
    connectionTypes?: ConnectionType[],
  ) =>
    [
      'connections',
      'forward',
      url,
      'infinite',
      limit,
      connectionTypes,
    ] as const,
  backwardForUrl: (url: string) => ['connections', 'backward', url] as const,
  backwardForUrlInfinite: (
    url: string,
    limit?: number,
    connectionTypes?: ConnectionType[],
  ) =>
    [
      'connections',
      'backward',
      url,
      'infinite',
      limit,
      connectionTypes,
    ] as const,
  allForUrl: (url: string) => ['connections', 'all', url] as const,
  allForUrlInfinite: (
    url: string,
    limit?: number,
    connectionTypes?: ConnectionType[],
  ) => ['connections', 'all', url, 'infinite', limit, connectionTypes] as const,
  userConnections: (identifier: string) =>
    ['connections', 'user', identifier] as const,
  userConnectionsInfinite: (
    identifier: string,
    limit?: number,
    connectionTypes?: ConnectionType[],
  ) =>
    [
      'connections',
      'user',
      identifier,
      'infinite',
      limit,
      connectionTypes,
    ] as const,
};
