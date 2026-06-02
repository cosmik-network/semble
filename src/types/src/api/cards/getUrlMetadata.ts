import { z } from 'zod';
import { UrlMetadataSchema, UrlAggregateStatsSchema } from '../../entities/url';

export const GetUrlMetadataParamsSchema = z.object({
  url: z.string(),
  includeStats: z.boolean().optional(),
});
export type GetUrlMetadataParams = z.infer<typeof GetUrlMetadataParamsSchema>;

export const GetUrlMetadataResponseSchema = z.object({
  metadata: UrlMetadataSchema,
  stats: UrlAggregateStatsSchema.optional(),
});
export type GetUrlMetadataResponse = z.infer<
  typeof GetUrlMetadataResponseSchema
>;
