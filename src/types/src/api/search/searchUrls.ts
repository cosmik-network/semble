import { z } from 'zod';
import {
  PaginatedCardSortedParamsSchema,
  PaginationSchema,
  CardSortingSchema,
  UrlTypeSchema,
} from '../../entities/common';
import { CardSearchResultViewSchema } from './searchResults';

export const SearchUrlsParamsSchema = PaginatedCardSortedParamsSchema.extend({
  searchQuery: z.string(),
  urlType: UrlTypeSchema.optional(),
  /** ALL (default, blended), URL, or ANNOTATION */
  cardType: z.enum(['URL', 'ANNOTATION', 'ALL']).optional(),
});
export type SearchUrlsParams = z.infer<typeof SearchUrlsParamsSchema>;

export const SearchUrlsResponseSchema = z.object({
  results: z.array(CardSearchResultViewSchema),
  pagination: PaginationSchema,
  sorting: CardSortingSchema,
});
export type SearchUrlsResponse = z.infer<typeof SearchUrlsResponseSchema>;
