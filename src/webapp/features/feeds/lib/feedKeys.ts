import { UrlType, ActivitySource, ActivityType } from '@semble/types';

export const feedKeys = {
  all: () => ['feeds'] as const,
  infinite: (
    limit?: number,
    urlType?: UrlType,
    source?: ActivitySource,
    activityTypes?: ActivityType[],
    includeKnownBots?: boolean,
    actorIds?: string[],
  ) => [
    ...feedKeys.all(),
    'infinite',
    limit,
    urlType,
    source,
    activityTypes,
    includeKnownBots,
    actorIds,
  ],
  // Seed cards sampled out of recent global feed activity, used to stand in
  // for a library the reader doesn't have yet.
  seeds: (poolSize: number, count: number) =>
    [...feedKeys.all(), 'seeds', poolSize, count] as const,
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
