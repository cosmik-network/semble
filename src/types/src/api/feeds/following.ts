import { z } from 'zod';
import {
  PaginationParamsSchema,
  UrlTypeSchema,
  ActivitySourceSchema,
} from '../../entities/common';

export const GetFollowingFeedParamsSchema = PaginationParamsSchema.extend({
  beforeActivityId: z.string().optional(),
  urlType: UrlTypeSchema.optional(),
  source: ActivitySourceSchema.optional(),
  activityTypes: z.array(z.string()).optional(),
  includeKnownBots: z.boolean().optional(),
});
export type GetFollowingFeedParams = z.infer<
  typeof GetFollowingFeedParamsSchema
>;
