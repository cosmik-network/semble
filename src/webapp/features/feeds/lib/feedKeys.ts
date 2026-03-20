import { UrlType, ActivitySource, ActivityType } from '@semble/types';

export const feedKeys = {
  all: () => ['feeds'] as const,
  infinite: (
    limit?: number,
    urlType?: UrlType,
    source?: ActivitySource,
    activityTypes?: ActivityType[],
  ) => [...feedKeys.all(), 'infinite', limit, urlType, source, activityTypes],
  gems: () => [...feedKeys.all(), 'gems'] as const,
  gemsInfinite: (
    limit?: number,
    urlType?: UrlType,
    source?: ActivitySource,
    activityTypes?: ActivityType[],
  ) => [
    ...feedKeys.gems(),
    [...feedKeys.infinite()],
    urlType,
    limit,
    source,
    activityTypes,
  ],
  following: () => [...feedKeys.all(), 'following'] as const,
  followingInfinite: (
    limit?: number,
    urlType?: UrlType,
    source?: ActivitySource,
    activityTypes?: ActivityType[],
  ) =>
    [
      ...feedKeys.following(),
      'infinite',
      limit,
      urlType,
      source,
      activityTypes,
    ] as const,
};
