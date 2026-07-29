import { z } from 'zod';
import { UrlViewSchema } from '../../entities/connection';

export const RecommendedUrlsParamsSchema = z.object({
  queries: z.array(z.string()),
});
export type RecommendedUrlsParams = z.infer<typeof RecommendedUrlsParamsSchema>;

export const RecommendedUrlsResponseSchema = z.object({
  urls: z.array(UrlViewSchema),
});
export type RecommendedUrlsResponse = z.infer<
  typeof RecommendedUrlsResponseSchema
>;
