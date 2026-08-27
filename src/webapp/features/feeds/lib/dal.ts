import { NoSessionError } from '@/api-client/errors';
import { createSembleClient } from '@/services/client.apiClient';
import { UrlType, ActivitySource, ActivityType } from '@semble/types';
import { cache } from 'react';
import { verifySessionOnClient } from '@/lib/auth/dal';

interface PageParams {
  page?: number;
  limit?: number;
  urlType?: UrlType;
  source?: ActivitySource;
  activityTypes?: ActivityType[];
  actorIds?: string[];
  includeKnownBots?: boolean;
}

interface BskyFollowingParams extends PageParams {
  /** DID or handle whose Bluesky follows define the feed. */
  identifier?: string;
}

export const getGlobalFeed = cache(async (params?: PageParams) => {
  const client = createSembleClient();
  const response = await client.getGlobalFeed({
    page: params?.page,
    limit: params?.limit,
    urlType: params?.urlType,
    source: params?.source,
    activityTypes: params?.activityTypes,
    actorIds: params?.actorIds,
    includeKnownBots: params?.includeKnownBots,
  });

  return response;
});

export const getGemsActivityFeed = cache(async (params?: PageParams) => {
  const client = createSembleClient();
  const response = await client.getGemsActivityFeed({
    page: params?.page,
    limit: params?.limit,
    urlType: params?.urlType,
    source: params?.source,
    activityTypes: params?.activityTypes,
  });

  return response;
});

export const getFollowingFeed = cache(async (params?: PageParams) => {
  const session = await verifySessionOnClient({ redirectOnFail: true });
  if (!session) throw new NoSessionError();

  const client = createSembleClient();
  const response = await client.getFollowingFeed({
    page: params?.page,
    limit: params?.limit,
    urlType: params?.urlType,
    source: params?.source,
    activityTypes: params?.activityTypes,
    includeKnownBots: params?.includeKnownBots,
  });

  return response;
});

export const getBskyFollowingFeed = cache(
  async (params?: BskyFollowingParams) => {
    // A named account's feed is public; only your own needs the session.
    if (!params?.identifier) {
      const session = await verifySessionOnClient({ redirectOnFail: true });
      if (!session) throw new NoSessionError();
    }

    const client = createSembleClient();
    const response = await client.getBskyFollowingFeed({
      identifier: params?.identifier,
      page: params?.page,
      limit: params?.limit,
      urlType: params?.urlType,
      source: params?.source,
      activityTypes: params?.activityTypes,
      includeKnownBots: params?.includeKnownBots,
    });

    return response;
  },
);
