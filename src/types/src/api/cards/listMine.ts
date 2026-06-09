import { z } from 'zod';
import {
  PaginatedCardSortedParamsSchema,
  UrlTypeSchema,
} from '../../entities/common';

export const GetMyUrlCardsParamsSchema = PaginatedCardSortedParamsSchema.extend(
  {
    urlType: UrlTypeSchema.optional(),
    uncollected: z.boolean().optional(),
    searchText: z.string().optional(),
  },
);
export type GetMyUrlCardsParams = z.infer<typeof GetMyUrlCardsParamsSchema>;
