import { z } from 'zod';
import { UrlAggregateStatsSchema } from '../../entities/url';

export const MAX_BATCH_URL_STATS = 100;

export const GetBatchUrlStatsRequestSchema = z.object({
  urls: z.array(z.string().max(2048)).min(1).max(MAX_BATCH_URL_STATS),
});
export type GetBatchUrlStatsRequest = z.infer<
  typeof GetBatchUrlStatsRequestSchema
>;

export const UrlStatsItemSchema = z.object({
  // The URL exactly as sent in the request
  url: z.string(),
  stats: UrlAggregateStatsSchema,
  // Caller-relative status, only populated for authenticated requests
  urlInLibrary: z.boolean().optional(),
  urlIsConnected: z.boolean().optional(),
});
export type UrlStatsItem = z.infer<typeof UrlStatsItemSchema>;

export const GetBatchUrlStatsResponseSchema = z.object({
  // In request order, deduplicated; invalid URLs are omitted
  urls: z.array(UrlStatsItemSchema),
});
export type GetBatchUrlStatsResponse = z.infer<
  typeof GetBatchUrlStatsResponseSchema
>;
