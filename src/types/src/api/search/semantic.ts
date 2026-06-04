import { z } from 'zod';
import {
  PaginatedSortedParamsSchema,
  PaginationSchema,
} from '../../entities/common';
import { UrlViewSchema } from '../../entities/connection';

export const SemanticSearchUrlsParamsSchema =
  PaginatedSortedParamsSchema.extend({
    query: z.string(),
    threshold: z.number().optional(),
    urlType: z.string().optional(),
    identifier: z.string().optional(),
  });
export type SemanticSearchUrlsParams = z.infer<
  typeof SemanticSearchUrlsParamsSchema
>;

export const SemanticSearchUrlsResponseSchema = z.object({
  urls: z.array(UrlViewSchema),
  pagination: PaginationSchema,
});
export type SemanticSearchUrlsResponse = z.infer<
  typeof SemanticSearchUrlsResponseSchema
>;
