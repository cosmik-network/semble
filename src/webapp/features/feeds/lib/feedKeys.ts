import { UrlType, ActivitySource } from '@semble/types';

export const feedKeys = {
  all: () => ['feeds'] as const,
  infinite: (limit?: number, urlType?: UrlType, source?: ActivitySource) => [
    ...feedKeys.all(),
    'infinite',
    limit,
    urlType,
    source,
  ],
  gems: () => [...feedKeys.all(), 'gems'] as const,
  gemsInfinite: (
    limit?: number,
    urlType?: UrlType,
    source?: ActivitySource,
  ) => [...feedKeys.gems(), [...feedKeys.infinite()], urlType, limit, source],
  following: () => [...feedKeys.all(), 'following'] as const,
  followingInfinite: (
    limit?: number,
    urlType?: UrlType,
    source?: ActivitySource,
  ) => [...feedKeys.following(), 'infinite', limit, urlType, source] as const,
};
