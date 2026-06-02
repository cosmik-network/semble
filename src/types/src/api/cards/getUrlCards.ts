import { z } from 'zod';
import { PaginationSchema, CardSortingSchema } from '../../entities/common';
import { UrlCardSchema } from '../../entities/card';

export const GetUrlCardsResponseSchema = z.object({
  cards: z.array(UrlCardSchema),
  pagination: PaginationSchema,
  sorting: CardSortingSchema,
});
export type GetUrlCardsResponse = z.infer<typeof GetUrlCardsResponseSchema>;
