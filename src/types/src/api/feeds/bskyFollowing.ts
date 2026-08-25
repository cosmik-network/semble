import { z } from 'zod';
import {
  PaginationParamsSchema,
  UrlTypeSchema,
  ActivitySourceSchema,
} from '../../entities/common';

export const GetBskyFollowingFeedParamsSchema = PaginationParamsSchema.extend({
  beforeActivityId: z.string().optional(),
  urlType: UrlTypeSchema.optional(),
  source: ActivitySourceSchema.optional(),
  activityTypes: z.array(z.string()).optional(),
  includeKnownBots: z.boolean().optional(),
});
export type GetBskyFollowingFeedParams = z.infer<
  typeof GetBskyFollowingFeedParamsSchema
>;
