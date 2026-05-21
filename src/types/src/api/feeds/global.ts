import { z } from 'zod';
import {
  PaginationParamsSchema,
  FeedPaginationSchema,
  UrlTypeSchema,
  ActivitySourceSchema,
} from '../../entities/common';
import { FeedItemSchema } from '../../entities/feed';

export const GetGlobalFeedParamsSchema = PaginationParamsSchema.extend({
  beforeActivityId: z.string().optional(),
  urlType: UrlTypeSchema.optional(),
  source: ActivitySourceSchema.optional(),
  activityTypes: z.array(z.string()).optional(),
  includeKnownBots: z.boolean().optional(),
});
export type GetGlobalFeedParams = z.infer<typeof GetGlobalFeedParamsSchema>;

export const GetGlobalFeedResponseSchema = z.object({
  activities: z.array(FeedItemSchema),
  pagination: FeedPaginationSchema,
});
export type GetGlobalFeedResponse = z.infer<typeof GetGlobalFeedResponseSchema>;
