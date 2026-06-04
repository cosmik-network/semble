import { z } from 'zod';
import {
  PaginatedSortedParamsSchema,
  UrlTypeSchema,
} from '../../entities/common';

export const GetMyUrlCardsParamsSchema = PaginatedSortedParamsSchema.extend({
  urlType: UrlTypeSchema.optional(),
  uncollected: z.boolean().optional(),
});
export type GetMyUrlCardsParams = z.infer<typeof GetMyUrlCardsParamsSchema>;
