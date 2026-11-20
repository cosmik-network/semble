import { z } from 'zod';
import {
  PaginatedCardSortedParamsSchema,
  UrlTypeSchema,
} from '../../entities/common';

// Which card types to include. Defaults to URL only (backwards compatible).
// Accepts a comma-separated string ('URL,ANNOTATION') for query params or an
// array for request bodies.
export const CardTypesParamSchema = z.preprocess(
  (v) => (typeof v === 'string' ? v.split(',') : v),
  z.array(z.enum(['URL', 'ANNOTATION'])).optional(),
);

export const GetMyUrlCardsParamsSchema = PaginatedCardSortedParamsSchema.extend(
  {
    urlType: UrlTypeSchema.optional(),
    uncollected: z.boolean().optional(),
    searchText: z.string().optional(),
    cardTypes: CardTypesParamSchema,
  },
);
export type GetMyUrlCardsParams = z.infer<typeof GetMyUrlCardsParamsSchema>;
