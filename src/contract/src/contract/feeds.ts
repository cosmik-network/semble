import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  paths,
  UrlTypeSchema,
  ActivitySourceSchema,
  GetGlobalFeedResponseSchema,
} from '@semble/types';

const c = initContract();

const FeedQuery = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  urlType: UrlTypeSchema.optional(),
  source: ActivitySourceSchema.optional(),
  activityTypes: z.array(z.string()).optional(),
  includeKnownBots: z.coerce.boolean().optional(),
});

export const feedsContract = c.router(
  {
    globalFeed: {
      method: 'GET',
      path: paths.globalFeed,
      query: FeedQuery.extend({
        beforeActivityId: z.string().optional(),
      }),
      responses: { 200: GetGlobalFeedResponseSchema },
      summary: 'Get global feed',
      description:
        'Returns a paginated activity feed across all users, ordered by recency, with optional filters.',
    },
    gemFeed: {
      method: 'GET',
      path: paths.gemFeed,
      query: FeedQuery,
      responses: { 200: GetGlobalFeedResponseSchema },
      summary: 'Get gem feed',
      description:
        'Returns a curated feed of highly-saved URLs (gems), ordered by library count.',
      metadata: { internal: true } as const,
    },
    followingFeed: {
      method: 'GET',
      path: paths.followingFeed,
      query: FeedQuery.extend({
        beforeActivityId: z.string().optional(),
      }),
      responses: { 200: GetGlobalFeedResponseSchema },
      summary: 'Get following feed',
      description:
        'Returns an activity feed of users and collections the authenticated user follows.',
    },
  },
  { strictStatusCodes: true },
);
