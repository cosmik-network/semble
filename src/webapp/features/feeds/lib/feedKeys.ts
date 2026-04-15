import { UrlType, ActivitySource, ActivityType } from '@semble/types';

export const feedKeys = {
  all: () => ['feeds'] as const,
  infinite: (
    limit?: number,
    urlType?: UrlType,
    source?: ActivitySource,
    activityTypes?: ActivityType[],
    includeKnownBots?: boolean,
  ) => [
    ...feedKeys.all(),
    'infinite',
    limit,
    urlType,
    source,
    activityTypes,
    includeKnownBots,
  ],
  gems: () => [...feedKeys.all(), 'gems'] as const,
  gemsInfinite: (
    limit?: number,
    urlType?: UrlType,
    source?: ActivitySource,
    activityTypes?: ActivityType[],
    includeKnownBots?: boolean,
  ) => [
    ...feedKeys.gems(),
    [...feedKeys.infinite()],
    urlType,
    limit,
    source,
    activityTypes,
    includeKnownBots,
  ],
  following: () => [...feedKeys.all(), 'following'] as const,
  followingInfinite: (
    limit?: number,
    urlType?: UrlType,
    source?: ActivitySource,
    activityTypes?: ActivityType[],
    includeKnownBots?: boolean,
  ) =>
    [
      ...feedKeys.following(),
      'infinite',
      limit,
      urlType,
      source,
      activityTypes,
      includeKnownBots,
    ] as const,
};
