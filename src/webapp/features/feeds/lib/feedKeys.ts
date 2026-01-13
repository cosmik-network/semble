import { UrlType } from '@semble/types';

export const feedKeys = {
  all: () => ['feeds'] as const,
  infinite: (limit?: number, urlType?: UrlType) => [
    ...feedKeys.all(),
    'infinite',
    limit,
    urlType,
  ],
  gems: () => [...feedKeys.all(), 'gems'] as const,
  gemsInfinite: (limit?: number, urlType?: UrlType) => [
    ...feedKeys.gems(),
    [...feedKeys.infinite()],
    urlType,
    limit,
  ],
};
