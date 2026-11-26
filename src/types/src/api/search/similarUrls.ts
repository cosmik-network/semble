import { z } from 'zod';
import {
  PaginatedSortedParamsSchema,
  PaginationSchema,
} from '../../entities/common';
import {
  CardSearchResultViewSchema,
  CardTypeFilterSchema,
} from './searchResults';

export const GetSimilarUrlsForUrlParamsSchema =
  PaginatedSortedParamsSchema.extend({
    url: z.string(),
    threshold: z.number().optional(),
    urlType: z.string().optional(),
    cardType: CardTypeFilterSchema.optional(),
  });
export type GetSimilarUrlsForUrlParams = z.infer<
  typeof GetSimilarUrlsForUrlParamsSchema
>;

export const GetSimilarUrlsForUrlResponseSchema = z.object({
  results: z.array(CardSearchResultViewSchema),
  pagination: PaginationSchema,
});
export type GetSimilarUrlsForUrlResponse = z.infer<
  typeof GetSimilarUrlsForUrlResponseSchema
>;
