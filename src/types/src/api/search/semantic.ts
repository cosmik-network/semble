import { z } from 'zod';
import {
  PaginatedSortedParamsSchema,
  PaginationSchema,
} from '../../entities/common';
import {
  CardSearchResultViewSchema,
  CardTypeFilterSchema,
} from './searchResults';

export const SemanticSearchUrlsParamsSchema =
  PaginatedSortedParamsSchema.extend({
    query: z.string(),
    threshold: z.number().optional(),
    urlType: z.string().optional(),
    identifier: z.string().optional(),
    cardType: CardTypeFilterSchema.optional(),
  });
export type SemanticSearchUrlsParams = z.infer<
  typeof SemanticSearchUrlsParamsSchema
>;

export const SemanticSearchUrlsResponseSchema = z.object({
  results: z.array(CardSearchResultViewSchema),
  pagination: PaginationSchema,
});
export type SemanticSearchUrlsResponse = z.infer<
  typeof SemanticSearchUrlsResponseSchema
>;
