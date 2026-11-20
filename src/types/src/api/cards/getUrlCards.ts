import { z } from 'zod';
import { PaginationSchema, CardSortingSchema } from '../../entities/common';
import { CardItemSchema } from '../../entities/card';

export const GetUrlCardsResponseSchema = z.object({
  cards: z.array(CardItemSchema),
  pagination: PaginationSchema,
  sorting: CardSortingSchema,
});
export type GetUrlCardsResponse = z.infer<typeof GetUrlCardsResponseSchema>;
