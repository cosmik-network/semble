import { z } from 'zod';
import {
  PaginationParamsSchema,
  UrlTypeSchema,
  ActivitySourceSchema,
} from '../../entities/common';

export const GetBskyFollowingFeedParamsSchema = PaginationParamsSchema.extend({
  // DID or handle whose Bluesky follows define the feed. Defaults to the
  // authenticated user; required when unauthenticated.
  identifier: z.string().optional(),
  beforeActivityId: z.string().optional(),
  urlType: UrlTypeSchema.optional(),
  source: ActivitySourceSchema.optional(),
  activityTypes: z.array(z.string()).optional(),
  includeKnownBots: z.boolean().optional(),
});
export type GetBskyFollowingFeedParams = z.infer<
  typeof GetBskyFollowingFeedParamsSchema
>;
