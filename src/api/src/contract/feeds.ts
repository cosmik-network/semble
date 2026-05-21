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

export const feedsContract = c.router({
  globalFeed: {
    method: 'GET',
    path: paths.globalFeed,
    query: FeedQuery.extend({
      beforeActivityId: z.string().optional(),
    }),
    responses: { 200: GetGlobalFeedResponseSchema },
  },
  gemFeed: {
    method: 'GET',
    path: paths.gemFeed,
    query: FeedQuery,
    responses: { 200: GetGlobalFeedResponseSchema },
  },
  followingFeed: {
    method: 'GET',
    path: paths.followingFeed,
    query: FeedQuery.extend({
      beforeActivityId: z.string().optional(),
    }),
    responses: { 200: GetGlobalFeedResponseSchema },
  },
});
