import { z } from 'zod';
import {
  PaginationParamsSchema,
  UrlTypeSchema,
  ActivitySourceSchema,
} from '../../entities/common';

export const GetGemActivityFeedParamsSchema = PaginationParamsSchema.extend({
  urlType: UrlTypeSchema.optional(),
  source: ActivitySourceSchema.optional(),
  activityTypes: z.array(z.string()).optional(),
  includeKnownBots: z.boolean().optional(),
});
export type GetGemActivityFeedParams = z.infer<
  typeof GetGemActivityFeedParamsSchema
>;
