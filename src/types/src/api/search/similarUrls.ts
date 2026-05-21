import { z } from 'zod';
import {
  PaginatedSortedParamsSchema,
  PaginationSchema,
} from '../../entities/common';
import { UrlViewSchema } from '../../entities/connection';

export const GetSimilarUrlsForUrlParamsSchema =
  PaginatedSortedParamsSchema.extend({
    url: z.string(),
    threshold: z.number().optional(),
    urlType: z.string().optional(),
  });
export type GetSimilarUrlsForUrlParams = z.infer<
  typeof GetSimilarUrlsForUrlParamsSchema
>;

export const GetSimilarUrlsForUrlResponseSchema = z.object({
  urls: z.array(UrlViewSchema),
  pagination: PaginationSchema,
});
export type GetSimilarUrlsForUrlResponse = z.infer<
  typeof GetSimilarUrlsForUrlResponseSchema
>;
