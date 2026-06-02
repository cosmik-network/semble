import { z } from 'zod';
import {
  PaginatedSortedParamsSchema,
  UrlTypeSchema,
} from '../../entities/common';

export const GetUrlCardsParamsSchema = PaginatedSortedParamsSchema.extend({
  identifier: z.string(),
  urlType: UrlTypeSchema.optional(),
  uncollected: z.boolean().optional(),
});
export type GetUrlCardsParams = z.infer<typeof GetUrlCardsParamsSchema>;
