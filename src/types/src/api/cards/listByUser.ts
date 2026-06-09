import { z } from 'zod';
import {
  PaginatedCardSortedParamsSchema,
  UrlTypeSchema,
} from '../../entities/common';

export const GetUrlCardsParamsSchema = PaginatedCardSortedParamsSchema.extend({
  identifier: z.string(),
  urlType: UrlTypeSchema.optional(),
  uncollected: z.boolean().optional(),
});
export type GetUrlCardsParams = z.infer<typeof GetUrlCardsParamsSchema>;
