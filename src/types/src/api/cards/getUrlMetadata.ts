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
  // Caller-relative status, only populated for authenticated requests that
  // ask for stats. Lets clients refresh a URL's save/connect state in place.
  urlInLibrary: z.boolean().optional(),
  urlIsConnected: z.boolean().optional(),
});
export type GetUrlMetadataResponse = z.infer<
  typeof GetUrlMetadataResponseSchema
>;
