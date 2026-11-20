import { z } from 'zod';
import {
  PaginatedCardSortedParamsSchema,
  UrlTypeSchema,
} from '../../entities/common';
import { CardTypesParamSchema } from './listMine';

export const GetUrlCardsParamsSchema = PaginatedCardSortedParamsSchema.extend({
  identifier: z.string(),
  urlType: UrlTypeSchema.optional(),
  uncollected: z.boolean().optional(),
  searchText: z.string().optional(),
  cardTypes: CardTypesParamSchema,
});
export type GetUrlCardsParams = z.infer<typeof GetUrlCardsParamsSchema>;
