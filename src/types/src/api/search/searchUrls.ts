import { z } from 'zod';
import {
  PaginatedCardSortedParamsSchema,
  PaginationSchema,
  CardSortingSchema,
  UrlTypeSchema,
} from '../../entities/common';
import { UrlViewSchema } from '../../entities/connection';

export const SearchUrlsParamsSchema = PaginatedCardSortedParamsSchema.extend({
  searchQuery: z.string(),
  urlType: UrlTypeSchema.optional(),
});
export type SearchUrlsParams = z.infer<typeof SearchUrlsParamsSchema>;

export const SearchUrlsResponseSchema = z.object({
  urls: z.array(UrlViewSchema),
  pagination: PaginationSchema,
  sorting: CardSortingSchema,
});
export type SearchUrlsResponse = z.infer<typeof SearchUrlsResponseSchema>;
